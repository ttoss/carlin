import type { EventPayloadMap } from '@octokit/webhooks-types';
import AdmZip from 'adm-zip';
import { CodePipelineEvent, CodePipelineHandler } from 'aws-lambda';
import { CodePipeline, S3 } from 'aws-sdk';
import * as fs from 'fs';

import { Pipeline, getMainCommands, getTagCommands } from '../pipelines';

import { executeTasks, shConditionalCommands } from './executeTasks';

const codepipeline = new CodePipeline();

const getUserParameters = (event: CodePipelineEvent) => {
  const [pipeline, stage] = event[
    'CodePipeline.job'
  ].data.actionConfiguration.configuration.UserParameters.split('&');

  return { pipeline: pipeline as Pipeline, stage };
};

export const getJobDetails = async (event: CodePipelineEvent) => {
  const jobId = event['CodePipeline.job'].id;

  const s3 = new S3({
    credentials: event['CodePipeline.job'].data.artifactCredentials,
  });

  const { bucketName, objectKey } = event[
    'CodePipeline.job'
  ].data.inputArtifacts[0].location.s3Location;

  const { Body } = await s3
    .getObject({ Bucket: bucketName, Key: objectKey })
    .promise();

  if (!Body) {
    throw new Error(
      'Cannot retrieve the job description (there is no input artifact).',
    );
  }

  const filename = `/tmp/${jobId}.zip`;

  await fs.promises.writeFile(filename, Body as any, {});

  const zip = new AdmZip(filename);

  const file = zip.readAsText(getUserParameters(event).pipeline);

  try {
    return JSON.parse(file);
  } catch {
    throw new Error(`Job details is not a valid json. ${file}`);
  }
};

const putJobSuccessResult = (event: CodePipelineEvent) =>
  codepipeline
    .putJobSuccessResult({ jobId: event['CodePipeline.job'].id })
    .promise();

const putJobFailureResult = (event: CodePipelineEvent, message: string) =>
  codepipeline
    .putJobFailureResult({
      jobId: event['CodePipeline.job'].id,
      failureDetails: { type: 'JobFailed', message },
    })
    .promise();

const executeMainPipeline = async () => {
  const command = shConditionalCommands({
    conditionalCommands: getMainCommands(),
  });
  await executeTasks({ commands: [command] });
};

const executeTagPipeline = async ({
  payload,
}: {
  payload: EventPayloadMap['push'];
}) => {
  const tag = payload.ref.split('/')[2];
  const command = shConditionalCommands({
    conditionalCommands: getTagCommands({ tag }),
  });
  await executeTasks({ commands: [command] });
};

export const pipelinesHandler: CodePipelineHandler = async (event) => {
  try {
    const { pipeline } = getUserParameters(event);

    const jobDetails = await getJobDetails(event);

    if (pipeline === 'main') {
      await executeMainPipeline();
      await putJobSuccessResult(event);
      return;
    }

    if (pipeline === 'tag') {
      await executeTagPipeline(jobDetails);
      await putJobSuccessResult(event);
      return;
    }

    throw new Error(`Pipeline ${pipeline} was not handled.`);
  } catch (error) {
    await putJobFailureResult(event, error.message.slice(0, 4999));
  }
};

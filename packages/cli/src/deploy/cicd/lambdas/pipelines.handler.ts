import AdmZip from 'adm-zip';
import { CodePipelineEvent, CodePipelineHandler } from 'aws-lambda';
import { CodePipeline, S3 } from 'aws-sdk';
import * as fs from 'fs';

import { Pipeline } from '../pipelines';

import { executeTasks, shConditionalCommands } from './executeTasks';

const codepipeline = new CodePipeline();

const getPipeline = (event: CodePipelineEvent) =>
  event['CodePipeline.job'].data.actionConfiguration.configuration
    .UserParameters as Pipeline;

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

  const file = zip.readAsText(getPipeline(event));

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

const executeMainPipeline = async (event: CodePipelineEvent) => {
  const command = shConditionalCommands({
    conditionalCommands: ['yarn', 'yarn test', 'yarn build'],
  });
  await executeTasks({ commands: [command] });
  await putJobSuccessResult(event);
};

export const pipelinesHandler: CodePipelineHandler = async (event) => {
  try {
    const pipeline = getPipeline(event);

    // const jobDetails = await getJobDetails(event);

    if (pipeline === 'main') {
      await executeMainPipeline(event);
      return;
    }

    throw new Error(`Pipeline ${pipeline} was not handled.`);
  } catch (error) {
    await putJobFailureResult(event, error.message);
  }
};

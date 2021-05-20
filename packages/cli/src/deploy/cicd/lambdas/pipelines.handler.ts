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

export const getJobDetailsFilename = (jobId: string) => `/tmp/${jobId}.zip`;

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

  const filename = getJobDetailsFilename(jobId);

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

export const pipelinesHandler: CodePipelineHandler = async (event) => {
  try {
    const { pipeline } = getUserParameters(event);

    const jobDetails = await getJobDetails(event);

    const jobId = event['CodePipeline.job'].id;

    const executeTasksInput = (() => {
      const tags = [
        {
          key: 'Pipeline',
          value: pipeline,
        },
        {
          key: 'AfterCommit',
          value: jobDetails.after,
        },
        {
          key: 'PipelineJobId',
          value: jobId,
        },
      ];

      const taskEnvironment = [
        {
          name: 'PIPELINE_JOB_ID',
          value: jobId,
        },
      ];

      if (pipeline === 'main') {
        return {
          commands: [
            shConditionalCommands({
              conditionalCommands: getMainCommands(),
            }),
          ],
          tags,
          taskEnvironment,
        };
      }

      if (pipeline === 'tag') {
        const tag = jobDetails.ref.split('/')[2];

        return {
          commands: [
            shConditionalCommands({
              conditionalCommands: getTagCommands({ tag }),
            }),
          ],
          tags: [
            ...tags,
            {
              key: 'Tag',
              value: tag,
            },
          ],
          taskEnvironment,
        };
      }

      return undefined;
    })();

    if (!executeTasksInput) {
      throw new Error('executeTasksInputUndefined');
    }

    await executeTasks(executeTasksInput);

    await putJobSuccessResult(event);
  } catch (error) {
    await putJobFailureResult(event, error.message.slice(0, 4999));
  }
};

import * as fs from 'fs';
import log from 'npmlog';
import * as path from 'path';

import { waitCodeBuildFinish, startCodeBuildBuild } from '../../utils';

import { deploy, getStackOutput } from '../cloudFormation.core';
import { handleDeployError, handleDeployInitialization } from '../utils';

import { deployLambdaCode } from '../lambda';

import type { Pipeline } from './pipelines';
import {
  REPOSITORY_IMAGE_CODE_BUILD_PROJECT_LOGICAL_ID,
  getCicdTemplate,
} from './cicd.template';
import { getCicdStackName } from './getCicdStackName';

const logPrefix = 'cicd';

export const getLambdaInput = (extension: 'js' | 'ts') =>
  path.resolve(__dirname, `lambdas/index.${extension}`);

const deployCicdLambdas = async ({ stackName }: { stackName: string }) => {
  const lambdaInput = (() => {
    /**
     * This case happens when carlin command is executed when the package is
     * built.
     */
    if (fs.existsSync(getLambdaInput('js'))) {
      return getLambdaInput('js');
    }

    /**
     * The package isn't built.
     */
    if (fs.existsSync(getLambdaInput('ts'))) {
      return getLambdaInput('ts');
    }

    throw new Error('Cannot read CICD lambdas file.');
  })();

  const s3 = await deployLambdaCode({
    lambdaInput,
    lambdaExternals: [],
    /**
     * Needs stackName to define the S3 key.
     */
    stackName,
  });

  if (!s3 || !s3.bucket) {
    throw new Error(
      'Cannot retrieve bucket in which Lambda code was deployed.',
    );
  }

  return s3;
};

const waitRepositoryImageUpdate = async ({
  stackName,
}: {
  stackName: string;
}) => {
  log.info(logPrefix, 'Starting repository image update...');

  const { OutputValue: projectName } = await getStackOutput({
    stackName,
    outputKey: REPOSITORY_IMAGE_CODE_BUILD_PROJECT_LOGICAL_ID,
  });

  if (!projectName) {
    throw new Error(`Cannot retrieve repository image CodeBuild project name.`);
  }

  const build = await startCodeBuildBuild({ projectName });

  if (build.id) {
    await waitCodeBuildFinish({ buildId: build.id, name: stackName });
  }
};

export const deployCicd = async ({
  cpu,
  memory,
  pipelines,
  updateRepository,
  slackWebhookUrl,
  sshKey,
  sshUrl,
  taskEnvironment,
}: {
  cpu?: string;
  memory?: string;
  pipelines: Pipeline[];
  updateRepository?: boolean;
  slackWebhookUrl?: string;
  sshKey: string;
  sshUrl: string;
  taskEnvironment: Array<{ name: string; value: string }>;
}) => {
  try {
    const { stackName } = await handleDeployInitialization({
      logPrefix,
      stackName: getCicdStackName(),
    });

    await deploy({
      template: getCicdTemplate({
        cpu,
        memory,
        pipelines,
        s3: await deployCicdLambdas({ stackName }),
        slackWebhookUrl,
        taskEnvironment,
      }),
      params: {
        StackName: stackName,
        Parameters: [
          { ParameterKey: 'SSHUrl', ParameterValue: sshUrl },
          { ParameterKey: 'SSHKey', ParameterValue: sshKey },
        ],
      },
      terminationProtection: true,
    });

    if (updateRepository) {
      await waitRepositoryImageUpdate({ stackName });
    }
  } catch (error: any) {
    handleDeployError({ error, logPrefix });
  }
};

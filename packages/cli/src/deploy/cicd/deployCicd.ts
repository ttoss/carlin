import * as fs from 'fs';
import * as path from 'path';

import { deploy } from '../cloudFormation.core';
import { handleDeployError, handleDeployInitialization } from '../utils';

import { deployLambdaCode } from '../lambda';

import { getCicdTemplate } from './cicd.template';
import { getCicdStackName } from './getCicdStackName';

const logPrefix = 'cicd';

const deployCicdLambdas = async ({ stackName }: { stackName: string }) => {
  const getLambdaInput = (extension: 'js' | 'ts') =>
    path.resolve(__dirname, `lambdas.${extension}`);

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

export const deployCicd = async ({
  sshKey,
  sshUrl,
}: {
  sshKey: string;
  sshUrl: string;
}) => {
  try {
    const { stackName } = await handleDeployInitialization({
      logPrefix,
      stackName: getCicdStackName(),
    });

    await deploy({
      template: getCicdTemplate({ s3: await deployCicdLambdas({ stackName }) }),
      params: {
        StackName: stackName,
        Parameters: [
          { ParameterKey: 'SSHUrl', ParameterValue: sshUrl },
          { ParameterKey: 'SSHKey', ParameterValue: sshKey },
        ],
      },
      terminationProtection: true,
    });
  } catch (error) {
    handleDeployError({ error, logPrefix });
  }
};

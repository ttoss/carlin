import { deploy } from '../cloudFormation.core';
import { handleDeployError, handleDeployInitialization } from '../utils';

import { getCicdTemplate } from './cicd.template';
import { getStackName } from './getStackName';

const logPrefix = 'cicd';

export const deployCicd = async ({
  repository,
  sshKey,
}: {
  repository: string;
  sshKey: string;
}) => {
  try {
    const { stackName } = await handleDeployInitialization({
      logPrefix,
      stackName: getStackName(),
    });

    if (stackName) {
      process.exit();
    }

    await deploy({
      template: getCicdTemplate(),
      params: {
        StackName: stackName,
        Parameters: [
          { ParameterKey: 'Repository', ParameterValue: repository },
          { ParameterKey: 'SSHKey', ParameterValue: sshKey },
        ],
      },
      terminationProtection: true,
    });
  } catch (error) {
    handleDeployError({ error, logPrefix });
  }
};

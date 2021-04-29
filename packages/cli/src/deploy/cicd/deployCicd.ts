import { deploy } from '../cloudFormation.core';
import { handleDeployError, handleDeployInitialization } from '../utils';

import { getCicdTemplate } from './cicd.template';
import { getCicdStackName } from './getCicdStackName';

const logPrefix = 'cicd';

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
      template: getCicdTemplate(),
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

import log from 'npmlog';

import { getStackName, setPreDefinedStackName } from './stackName';

export const deployErrorLogs = ({
  error,
  logPrefix,
}: {
  error: Error;
  logPrefix: string;
}) => {
  log.error(logPrefix, `An error occurred. Cannot deploy ${logPrefix}.`);
  log.error(logPrefix, 'Error message: %j', error.message);
};

export const handleDeployError = ({
  error,
  logPrefix,
}: {
  error: Error;
  logPrefix: string;
}) => {
  deployErrorLogs({ error, logPrefix });
  process.exit(1);
};

export const handleDeployInitialization = async ({
  logPrefix,
  stackName: preDefinedStackName,
}: {
  logPrefix: string;
  stackName?: string;
}) => {
  log.info(logPrefix, `Starting deploy ${logPrefix}...`);

  if (preDefinedStackName) {
    setPreDefinedStackName(preDefinedStackName);
  }

  const stackName = await getStackName();

  log.info(logPrefix, `stackName: ${stackName}`);

  return { stackName };
};

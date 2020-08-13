import log from 'npmlog';

import { deploy } from '../cloudFormation';

import { PEPE_BASE_STACK_NAME } from './config';
import { template } from './pepeBucket.template';

const logPrefix = 'pepeBase';

const createPepeBucket = async () => {
  log.info(logPrefix, 'Create Pepe Bucket.');
  return deploy({
    template,
    params: { StackName: PEPE_BASE_STACK_NAME },
    terminationProtection: true,
  });
};

export const deployPepeBase = async () => {
  try {
    await Promise.all([createPepeBucket()]);
  } catch (err) {
    log.error(logPrefix, 'Cannot deploy pepe base.');
    log.error(logPrefix, 'Error message: %j', err.message);
    process.exit();
  }
};

import log from 'npmlog';

import { deploy } from '../cloudFormation';

import { BASE_STACK_NAME } from './config';
import { template } from './bucket.template';

const logPrefix = 'baseStack';

const createBaseStackBucket = async () => {
  log.info(logPrefix, 'Create base stack bucket.');
  return deploy({
    template,
    params: { StackName: BASE_STACK_NAME },
    terminationProtection: true,
  });
};

export const deployBaseStack = async () => {
  try {
    await Promise.all([createBaseStackBucket()]);
  } catch (err) {
    log.error(logPrefix, 'Cannot deploy base stack.');
    log.error(logPrefix, 'Error message: %j', err.message);
    process.exit();
  }
};

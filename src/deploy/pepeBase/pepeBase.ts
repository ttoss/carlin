import log from 'npmlog';

import { PEPE_BUCKET_STACK_NAME } from '../../config';

import { deploy } from '../cloudFormation';

import { template } from './pepeBucket.template';

const logPrefix = 'pepeBase';

const createPepeBucket = async () => {
  log.info(logPrefix, 'Create Pepe Bucket.');
  return deploy({ template, params: { StackName: PEPE_BUCKET_STACK_NAME } });
};

export const deployPepeBase = async () => {
  try {
    return Promise.all([createPepeBucket()]);
  } catch (err) {
    log.error(logPrefix, 'Cannot deploy pepe base.');
    log.error(logPrefix, 'Error message: %j', err.message);
  }
};

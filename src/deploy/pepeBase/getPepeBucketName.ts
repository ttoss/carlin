import { PEPE_BASE_STACK_NAME, PEPE_BUCKET_LOGICAL_NAME } from './config';

import { describeStack } from '../cloudFormation';

export const getPepeBucketName = async (): Promise<string> => {
  const { Outputs } = await describeStack({ stackName: PEPE_BASE_STACK_NAME });
  const bucketName = Outputs?.find(
    ({ OutputKey }) => OutputKey === PEPE_BUCKET_LOGICAL_NAME
  );
  if (!bucketName) {
    throw new Error(
      `Stack ${PEPE_BASE_STACK_NAME} doesn't have ${PEPE_BUCKET_LOGICAL_NAME} output.`
    );
  }
  if (!bucketName.OutputValue) {
    throw new Error(`Key ${PEPE_BUCKET_LOGICAL_NAME} has no OutputValue`);
  }
  return bucketName.OutputValue;
};

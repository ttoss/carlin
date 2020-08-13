import { CloudFormation } from 'aws-sdk';

import { PEPE_BASE_STACK_NAME, PEPE_BUCKET_LOGICAL_NAME } from './config';

export const getPepeBucketName = async (): Promise<string> => {
  const cloudFormation = new CloudFormation();
  const { Stacks } = await cloudFormation
    .describeStacks({ StackName: PEPE_BASE_STACK_NAME })
    .promise();

  if (!Stacks) {
    throw new Error(
      `Stack ${PEPE_BASE_STACK_NAME} not found and cannot be described`,
    );
  }
  const { Outputs } = Stacks[0];
  const bucketName = Outputs?.find(
    ({ OutputKey }) => OutputKey === PEPE_BUCKET_LOGICAL_NAME,
  );
  if (!bucketName) {
    throw new Error(
      `Stack ${PEPE_BASE_STACK_NAME} doesn't have ${PEPE_BUCKET_LOGICAL_NAME} output.`,
    );
  }
  if (!bucketName.OutputValue) {
    throw new Error(`Key ${PEPE_BUCKET_LOGICAL_NAME} has no OutputValue`);
  }
  return bucketName.OutputValue;
};

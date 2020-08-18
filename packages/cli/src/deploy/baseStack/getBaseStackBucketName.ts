import { CloudFormation } from 'aws-sdk';

import { BASE_STACK_NAME, BASE_STACK_BUCKET_LOGICAL_NAME } from './config';

export const getBaseStackBucketName = async (): Promise<string> => {
  const cloudFormation = new CloudFormation();
  const { Stacks } = await cloudFormation
    .describeStacks({ StackName: BASE_STACK_NAME })
    .promise();

  if (!Stacks) {
    throw new Error(
      `Stack ${BASE_STACK_NAME} not found and cannot be described`,
    );
  }
  const { Outputs } = Stacks[0];
  const bucketName = Outputs?.find(
    ({ OutputKey }) => OutputKey === BASE_STACK_BUCKET_LOGICAL_NAME,
  );
  if (!bucketName) {
    throw new Error(
      `Stack ${BASE_STACK_NAME} doesn't have ${BASE_STACK_BUCKET_LOGICAL_NAME} output.`,
    );
  }
  if (!bucketName.OutputValue) {
    throw new Error(`Key ${BASE_STACK_BUCKET_LOGICAL_NAME} has no OutputValue`);
  }
  return bucketName.OutputValue;
};

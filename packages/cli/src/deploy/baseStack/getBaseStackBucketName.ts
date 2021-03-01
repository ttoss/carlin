import { CloudFormation } from 'aws-sdk';

import { BASE_STACK_NAME, BASE_STACK_BUCKET_LOGICAL_NAME } from './config';

let baseBucketName = '';

export const getBaseStackBucketName = async (): Promise<string> => {
  if (baseBucketName) {
    return baseBucketName;
  }

  const cloudFormation = new CloudFormation();

  const Stacks = await (async () => {
    try {
      const response = await cloudFormation
        .describeStacks({ StackName: BASE_STACK_NAME })
        .promise();

      if (!response.Stacks) {
        throw new Error();
      }

      return response.Stacks;
    } catch (err) {
      throw new Error(
        `Stack ${BASE_STACK_NAME} not found. Please, check if you've deployed ${BASE_STACK_NAME}. If don't, execute \`carlin deploy base-stack\`, For more information, please, check this link https://carlin.ttoss.dev/docs/Commands/deploy%20base-stack`,
      );
    }
  })();

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
    throw new Error(
      `Key ${BASE_STACK_BUCKET_LOGICAL_NAME} has no OutputValue.`,
    );
  }

  baseBucketName = bucketName.OutputValue;

  return baseBucketName;
};

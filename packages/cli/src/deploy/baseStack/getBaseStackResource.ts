import { CloudFormation } from 'aws-sdk';

import {
  BASE_STACK_NAME,
  BASE_STACK_BUCKET_LOGICAL_NAME,
  BASE_STACK_LAMBDA_IMAGE_BUILDER_LOGICAL_NAME,
  BASE_STACK_LAMBDA_LAYER_BUILDER_LOGICAL_NAME,
} from './config';

export const getBaseStackOutput = async (resource: string) => {
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
        `Stack ${BASE_STACK_NAME} not found. Please, check if you've deployed ${BASE_STACK_NAME}. If don't, execute \`carlin deploy base-stack\`, For more information, please, check this link https://carlin.ttoss.dev/docs/commands/deploy-base-stack`,
      );
    }
  })();

  const { Outputs } = Stacks[0];

  const output = Outputs?.find(({ OutputKey }) => OutputKey === resource);

  if (!output) {
    throw new Error(
      `Stack ${BASE_STACK_NAME} doesn't have ${resource} output.`,
    );
  }

  if (!output.OutputValue) {
    throw new Error(`Key ${resource} has no OutputValue.`);
  }

  return output.OutputValue;
};

const resourcesKeys = {
  BASE_STACK_BUCKET_LOGICAL_NAME,
  BASE_STACK_LAMBDA_IMAGE_BUILDER_LOGICAL_NAME,
  BASE_STACK_LAMBDA_LAYER_BUILDER_LOGICAL_NAME,
};

const resources: any = {};

export const getBaseStackResource = async (
  resource: keyof typeof resourcesKeys,
): Promise<string> => {
  if (!resources[resource]) {
    resources[resource] = await getBaseStackOutput(resourcesKeys[resource]);
  }

  return resources[resource];
};

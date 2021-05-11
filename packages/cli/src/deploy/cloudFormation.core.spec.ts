/* eslint-disable import/first */
import { CloudFormation } from 'aws-sdk';
import * as faker from 'faker';

// : CloudFormation.DescribeStacksOutput
const describeStacksOutput = {
  Stacks: [
    {
      StackName: faker.random.word(),
      CreationTime: faker.date.past(3),
      StackStatus: 'OK',
      Outputs: [
        {
          OutputKey: faker.random.word(),
          OutputValue: faker.random.word(),
        },
        {
          OutputKey: faker.random.word(),
          OutputValue: faker.random.word(),
        },
      ],
    },
    {
      StackName: faker.random.word(),
      CreationTime: faker.date.past(3),
      StackStatus: 'OK',
      Outputs: [],
    },
  ],
};

jest.mock('aws-sdk', () => ({
  ...(jest.requireActual('aws-sdk') as any),
  CloudFormation: jest.fn(() => ({
    describeStacks: jest.fn(
      ({ StackName }: CloudFormation.DescribeStacksInput = {}) => ({
        promise: jest.fn(() => {
          return new Promise<CloudFormation.DescribeStacksOutput>((resolve) => {
            if (!StackName) {
              resolve(describeStacksOutput);
            } else {
              resolve({
                Stacks: (describeStacksOutput.Stacks || []).filter(
                  (stack) => stack.StackName === StackName,
                ),
              });
            }
          });
        }),
      }),
    ),
  })),
}));

import {
  describeStacks,
  describeStack,
  getStackOutput,
} from './cloudFormation.core';

describe('describe stack methods', () => {
  test('describeStacks should return all stacks', async () => {
    const stacks = await describeStacks();
    expect(stacks).toEqual(describeStacksOutput.Stacks);
  });

  test('describeStack should return only one stack', async () => {
    const stack = await describeStack({
      stackName: describeStacksOutput.Stacks[1].StackName,
    });
    expect(stack).toEqual(describeStacksOutput.Stacks[1]);
  });

  test('getStackOutput should return the output', async () => {
    const output = await getStackOutput({
      stackName: describeStacksOutput.Stacks[0].StackName,
      outputKey: describeStacksOutput.Stacks[0].Outputs[0].OutputKey,
    });
    expect(output).toEqual(describeStacksOutput.Stacks[0].Outputs[0]);
  });
});

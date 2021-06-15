/* eslint-disable import/first */
import {
  DescribeStacksCommand,
  DescribeStacksOutput,
} from '@aws-sdk/client-cloudformation';
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

jest.mock('@aws-sdk/client-cloudformation', () => ({
  ...(jest.requireActual('@aws-sdk/client-cloudformation') as any),
  CloudFormationClient: jest.fn(() => ({
    send: jest.fn((input: any) => {
      if (input instanceof DescribeStacksCommand) {
        const {
          input: { StackName },
        } = input;

        return new Promise<DescribeStacksOutput>((resolve, reject) => {
          if (!StackName) {
            resolve(describeStacksOutput);
          } else {
            const stacks = (describeStacksOutput.Stacks || []).filter(
              (stack) => stack.StackName === StackName,
            );

            if (stacks.length > 0) {
              resolve({
                Stacks: (describeStacksOutput.Stacks || []).filter(
                  (stack) => stack.StackName === StackName,
                ),
              });
            } else {
              // eslint-disable-next-line prefer-promise-reject-errors
              reject({
                Code: 'ValidationError',
              });
            }
          }
        });
      }

      return null;
    }),
  })),
}));

import {
  describeStacks,
  describeStack,
  doesStackExist,
  getStackOutput,
} from './cloudFormation.core';

describe('doesStackExist method', () => {
  test.each(describeStacksOutput.Stacks.map((stack) => stack.StackName))(
    'should return true if stack exists: %s',
    (stackName) => {
      return expect(doesStackExist({ stackName })).resolves.toEqual(true);
    },
  );

  test("should return false when stack doesn't exist", () => {
    const stackName = describeStacksOutput.Stacks.map(
      (stack) => stack.StackName,
    ).join('-');

    return expect(doesStackExist({ stackName })).resolves.toEqual(false);
  });
});

describe('describe stack methods', () => {
  test('describeStacks should return all stacks', async () => {
    const stacks = await describeStacks();
    expect(stacks).toEqual(describeStacksOutput.Stacks);
  });

  test.each(describeStacksOutput.Stacks.map((stack) => stack))(
    'describeStack should return only one stack %#',
    async (outputStack) => {
      const stack = await describeStack({
        stackName: outputStack.StackName,
      });
      expect(stack).toEqual(outputStack);
    },
  );

  test('getStackOutput should return the output', async () => {
    const output = await getStackOutput({
      stackName: describeStacksOutput.Stacks[0].StackName,
      outputKey: describeStacksOutput.Stacks[0].Outputs[0].OutputKey,
    });
    expect(output).toEqual(describeStacksOutput.Stacks[0].Outputs[0]);
  });
});

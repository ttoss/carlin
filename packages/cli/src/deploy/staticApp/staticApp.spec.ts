/* eslint-disable import/first */

import { CloudFormation } from 'aws-sdk';
import * as faker from 'faker';

const workingStackName = faker.random.word();

const workingStackBucketName = faker.random.word();

const workingStackNameWithoutPhysicalResourceId = faker.random.word();

const notWorkingStackName = [
  workingStackName,
  workingStackNameWithoutPhysicalResourceId,
].join('-');

jest.mock('aws-sdk', () => ({
  ...(jest.requireActual('aws-sdk') as any),
  CloudFormation: jest.fn(() => ({
    describeStackResource: jest.fn(
      ({ StackName }: CloudFormation.DescribeStackResourceInput) => ({
        promise: jest.fn(
          () =>
            new Promise((resolve, reject) => {
              if (StackName === workingStackName) {
                resolve({
                  StackResourceDetail: {
                    PhysicalResourceId: workingStackBucketName,
                  },
                });
              } else if (
                StackName === workingStackNameWithoutPhysicalResourceId
              ) {
                resolve({ StackResourceDetail: {} });
              } else {
                reject();
              }
            }),
        ),
      }),
    ),
  })),
}));

import { getStaticAppBucket } from './staticApp';

describe('Fixes #22 https://github.com/ttoss/carlin/issues/22', () => {
  test('should return the bucket name', async () => {
    return expect(
      getStaticAppBucket({
        stackName: workingStackName,
      }),
    ).resolves.toEqual(workingStackBucketName);
  });

  test("should return undefined because PhysicalResourceId doesn't exist", async () => {
    return expect(
      getStaticAppBucket({
        stackName: workingStackNameWithoutPhysicalResourceId,
      }),
    ).resolves.toBeUndefined();
  });

  test("should return undefined because stack doesn't exist", async () => {
    return expect(
      getStaticAppBucket({
        stackName: notWorkingStackName,
      }),
    ).resolves.toBeUndefined();
  });
});

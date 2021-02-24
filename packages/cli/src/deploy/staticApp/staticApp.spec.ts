/* eslint-disable import/first */

import { CloudFormation } from 'aws-sdk';
import * as faker from 'faker';

import { AWS_DEFAULT_REGION } from '../../config';

const region = AWS_DEFAULT_REGION;

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

jest.mock('../cloudFormation', () => ({
  ...(jest.requireActual('../cloudFormation') as any),
  deploy: jest.fn().mockResolvedValue({ Outputs: [] }),
}));

jest.mock('../s3', () => ({
  getAllFilesInsideADirectory: jest.fn().mockResolvedValue([]),
  uploadDirectoryToS3: jest.fn(),
}));

import * as s3Module from '../s3';

import * as staticAppModule from './staticApp';

const { getStaticAppBucket } = jest.requireActual('./staticApp');

describe('Fixes #23 https://github.com/ttoss/carlin/issues/23', () => {
  (staticAppModule.getStaticAppBucket as jest.Mock) = jest
    .fn()
    .mockResolvedValue(workingStackBucketName);

  const buildFolder = faker.random.word();

  test('uploadDirectoryToS3 bucket key must be undefined if cloudfront is false', async () => {
    const cloudfront = false;

    await staticAppModule.deployStaticApp({
      buildFolder,
      cloudfront,
      region,
    });

    expect(s3Module.uploadDirectoryToS3).toHaveBeenCalledWith(
      expect.objectContaining({
        bucketKey: undefined,
      }),
    );
  });

  test('uploadDirectoryToS3 bucket key must not be undefined if cloudfront is true', async () => {
    const cloudfront = true;

    await staticAppModule.deployStaticApp({
      buildFolder,
      cloudfront,
      region,
    });

    expect(s3Module.uploadDirectoryToS3).toHaveBeenCalledWith(
      expect.objectContaining({
        bucketKey: expect.any(String),
      }),
    );
  });
});

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
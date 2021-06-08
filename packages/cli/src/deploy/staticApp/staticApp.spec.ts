/* eslint-disable import/first */

import { DescribeStackResourceCommand } from '@aws-sdk/client-cloudformation';
import * as faker from 'faker';
import * as fs from 'fs';

// const readFileSyncMock = jest.fn();

// jest.mock('fs', () => ({
//   readFileSync: readFileSyncMock,
// }));

import { AWS_DEFAULT_REGION } from '../../config';

const region = AWS_DEFAULT_REGION;

const workingStackName = faker.random.word();

const workingStackBucketName = faker.random.word();

const workingStackNameWithoutPhysicalResourceId = faker.random.word();

const notWorkingStackName = [
  workingStackName,
  workingStackNameWithoutPhysicalResourceId,
].join('-');

jest.mock('@aws-sdk/client-cloudformation', () => ({
  ...(jest.requireActual('@aws-sdk/client-cloudformation') as any),
  CloudFormationClient: jest.fn(() => ({
    send: jest.fn((input: unknown) => {
      if (input instanceof DescribeStackResourceCommand) {
        const {
          input: { StackName },
        } = input;

        return new Promise((resolve, reject) => {
          if (StackName === workingStackName) {
            resolve({
              StackResourceDetail: {
                PhysicalResourceId: workingStackBucketName,
              },
            });
          } else if (StackName === workingStackNameWithoutPhysicalResourceId) {
            resolve({ StackResourceDetail: {} });
          } else {
            reject();
          }
        });
      }

      return null;
    }),
  })),
}));

jest.mock('fs');

jest.mock('../cloudFormation.core', () => ({
  ...(jest.requireActual('../cloudFormation.core') as any),
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

    const version = '2.4.7';

    /**
     * Mock packages/cli/src/utils/packageJson.ts read version.
     */
    jest.spyOn(fs, 'readFileSync').mockReturnValue({
      toString: () => JSON.stringify({ version }),
    } as any);

    await staticAppModule.deployStaticApp({
      buildFolder,
      cloudfront,
      region,
    });

    expect(s3Module.uploadDirectoryToS3).toHaveBeenCalledWith(
      expect.objectContaining({
        bucketKey: version,
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

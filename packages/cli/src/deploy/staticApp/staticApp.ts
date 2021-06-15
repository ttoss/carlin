/* eslint-disable no-template-curly-in-string */
import { CloudFormation, CloudFront } from 'aws-sdk';
import log from 'npmlog';
import semver from 'semver';

import { getPackageVersion } from '../../utils';

import { describeStackResource, deploy } from '../cloudFormation.core';
import {
  uploadDirectoryToS3,
  emptyS3Directory,
  deleteS3Directory,
  getAllFilesInsideADirectory,
  s3,
} from '../s3';
import { handleDeployError, handleDeployInitialization } from '../utils';

import { getStaticAppTemplate, CSP } from './staticApp.template';

const STATIC_APP_BUCKET_LOGICAL_ID = 'StaticBucket';

const CLOUDFRONT_DISTRIBUTION_ID = 'CloudFrontDistributionId';

const logPrefix = 'static-app';

export const getStaticAppBucket = async ({
  stackName,
}: {
  stackName: string;
}) => {
  const params = {
    LogicalResourceId: STATIC_APP_BUCKET_LOGICAL_ID,
    StackName: stackName,
  };
  try {
    const { StackResourceDetail } = await describeStackResource(params);
    return StackResourceDetail?.PhysicalResourceId;
  } catch (error) {
    return undefined;
  }
};

/**
 * Fixes #20 https://github.com/ttoss/carlin/issues/20
 */
export const defaultBuildFolders = ['build', 'out', 'storybook-static'];

const findDefaultBuildFolder = async () => {
  /**
   * Valid folders have at least one file inside.
   */
  const validFolders = await Promise.all(
    defaultBuildFolders.map(async (directory) => {
      const allFiles = await getAllFilesInsideADirectory({
        directory,
      });

      return { directory, isValid: allFiles.length !== 0 };
    }),
  );

  const validFolder = validFolders.reduce((acc, cur) => {
    if (cur.isValid) {
      return cur.directory;
    }

    return acc;
  }, '');

  return validFolder;
};

export const uploadBuiltAppToS3 = async ({
  buildFolder: directory,
  bucket,
  cloudfront,
}: {
  buildFolder?: string;
  bucket: string;
  cloudfront?: boolean;
}) => {
  const version = cloudfront ? getPackageVersion() : undefined;

  /**
   * Only empty directory if the number of the files inside $directory.
   * If the number of files is zero, uploadDirectoryToS3 will thrown.
   */
  if (directory) {
    const files = await getAllFilesInsideADirectory({ directory });
    if (files.length > 0) {
      await emptyS3Directory({ bucket, directory: version });
    }
    await uploadDirectoryToS3({ bucket, bucketKey: version, directory });
    return;
  }

  const defaultDirectory = await findDefaultBuildFolder();

  if (defaultDirectory) {
    await emptyS3Directory({ bucket, directory: version });
    await uploadDirectoryToS3({
      bucket,
      bucketKey: version,
      directory: defaultDirectory,
    });
    return;
  }

  throw new Error(
    `build-folder option wasn't provided and files weren't found in ${defaultBuildFolders.join(
      ', ',
    )} directories.`,
  );
};

/**
 * When a static-app deployment is executed, the algorithm delete old versions
 * if there are three newer versions, and keep these three. For instance, if
 * the bucket has the versions/folders below:
 *
 * - `9.0.1/`
 * - `9.0.2/`
 * - `9.2.0/`
 * - `9.3.0/`
 * - `9.3.1/`
 * - `10.0.0/` _<- created by the last deploy._
 *
 * The folders `9.0.1/`, `9.0.2/`, and `9.2.0/` will be delete after the
 * deploy.
 */
const removeOldVersions = async ({ bucket }: { bucket: string }) => {
  try {
    log.info(logPrefix, 'Removing old versions...');

    const { CommonPrefixes = [] } = await s3
      .listObjectsV2({ Bucket: bucket, Delimiter: '/' })
      .promise();

    const versions = CommonPrefixes?.map(({ Prefix }) =>
      Prefix?.replace('/', ''),
    )
      .filter((version) => !!version)
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      .sort((a, b) => (semver.gt(a!, b!) ? -1 : 1));

    /**
     * Keep the 3 most recent versions.
     */
    versions.shift();
    versions.shift();
    versions.shift();

    await Promise.all(
      versions.map((version) =>
        deleteS3Directory({ bucket, directory: `${version}` }),
      ),
    );
  } catch (error) {
    log.info(
      logPrefix,
      `Cannot remove older versions from "${bucket}" bucket.`,
    );
  }
};

export const invalidateCloudFront = async ({
  outputs,
}: {
  outputs?: CloudFormation.Outputs;
}) => {
  log.info(logPrefix, 'Invalidating CloudFront...');

  if (!outputs) {
    log.info(logPrefix, 'Invalidation: outputs do not exist.');
    return;
  }

  const cloudFrontDistributionIDOutput = outputs.find(
    (output) => output.OutputKey === CLOUDFRONT_DISTRIBUTION_ID,
  );

  if (cloudFrontDistributionIDOutput?.OutputValue) {
    const distributionId = cloudFrontDistributionIDOutput.OutputValue;

    const params: CloudFront.CreateInvalidationRequest = {
      DistributionId: distributionId,
      InvalidationBatch: {
        CallerReference: new Date().toISOString(),
        Paths: {
          Items: ['/*'],
          Quantity: 1,
        },
      },
    };

    const cloudFront = new CloudFront();

    try {
      await cloudFront.createInvalidation(params).promise();
      log.info(
        logPrefix,
        `CloudFront Distribution ID ${distributionId} invalidated with success.`,
      );
    } catch (err) {
      log.error(
        logPrefix,
        `Error while trying to invalidate CloudFront distribution ${distributionId}.`,
      );
      log.error(logPrefix, err);
    }
  } else {
    log.info(
      logPrefix,
      `Cannot invalidate because distribution does not exist.`,
    );
  }
};

/**
 * 1. Create the stack name that will be passed to CloudFormation.
 * 1. Create a CloudFormation template based on the type of the deployment, and
 *    the options, for instance, only S3, SPA, with hosted zone...
 * 1. Create AWS resources using the templated created.
 * 1. Upload static files to the host bucket S3.
 * 1. Remove old deployment versions. Keep only the 3 most recent ones.
 */
export const deployStaticApp = async ({
  acm,
  aliases,
  buildFolder,
  cloudfront,
  gtmId,
  csp,
  spa,
  hostedZoneName,
  region,
  skipUpload,
  invalidate = false,
}: {
  acm?: string;
  aliases?: string[];
  buildFolder?: string;
  cloudfront?: boolean;
  gtmId?: string;
  csp?: CSP;
  spa?: boolean;
  hostedZoneName?: string;
  region: string;
  skipUpload?: boolean;
  invalidate?: boolean;
}) => {
  try {
    const { stackName } = await handleDeployInitialization({ logPrefix });

    const params = { StackName: stackName };

    const template = getStaticAppTemplate({
      acm,
      aliases,
      cloudfront,
      gtmId,
      csp,
      spa,
      hostedZoneName,
      region,
    });

    const bucket = await getStaticAppBucket({ stackName });

    /**
     * Stack already exists. Upload files first after changing the files routes
     * because of the version changing.
     */
    if (bucket) {
      if (!skipUpload) {
        await uploadBuiltAppToS3({ buildFolder, bucket, cloudfront });
      }

      const { Outputs } = await deploy({ params, template });

      if (invalidate) {
        await invalidateCloudFront({ outputs: Outputs });
      }

      if (!skipUpload) {
        await removeOldVersions({ bucket });
      }
    } else {
      /**
       * Stack doesn't exist. Deploy CloudFormation first, get the bucket name,
       * and upload files to S3.
       */

      await deploy({ params, template });

      const newBucket = await getStaticAppBucket({ stackName });

      if (!newBucket) {
        throw new Error(`Cannot find bucket at ${stackName}.`);
      }

      await uploadBuiltAppToS3({ buildFolder, bucket: newBucket, cloudfront });
    }
  } catch (error) {
    handleDeployError({ error, logPrefix });
  }
};

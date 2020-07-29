/* eslint-disable no-template-curly-in-string */
import { CloudFormation, CloudFront } from 'aws-sdk';
import log from 'npmlog';

import { getEnvironment } from '../../utils';

import { cloudFormation, deploy } from '../cloudFormation';
import { uploadDirectoryToS3 } from '../s3';
import { getStackName } from '../stackName';

import { getStaticAppTemplate } from './staticApp.template';

const STATIC_APP_BUCKET_LOGICAL_ID = 'StaticBucket';

const CLOUDFRONT_DISTRIBUTION_ID = 'CloudFrontDistributionId';

const logPrefix = 'static-app';

const getStaticAppBucket = async ({ stackName }: { stackName: string }) => {
  const params = {
    LogicalResourceId: STATIC_APP_BUCKET_LOGICAL_ID,
    StackName: stackName,
  };
  const { StackResourceDetail } = await cloudFormation()
    .describeStackResource(params)
    .promise();
  return StackResourceDetail?.PhysicalResourceId;
};

export const uploadBuiltAppToS3 = async ({
  staticAppBuildFolder,
  staticAppBucket,
}: {
  staticAppBuildFolder: string;
  staticAppBucket: string;
}) => {
  await uploadDirectoryToS3({
    bucket: staticAppBucket,
    directory: staticAppBuildFolder,
  });
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
    (output) => output.OutputKey === CLOUDFRONT_DISTRIBUTION_ID
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
        `CloudFront Distribution ID ${distributionId} invalidated with success.`
      );
    } catch (err) {
      log.error(
        logPrefix,
        `Error while trying to invalidate CloudFront distribution ${distributionId}.`
      );
      log.error(logPrefix, err);
    }
  } else {
    log.info(
      logPrefix,
      `Cannot invalidate because distribution does not exist.`
    );
  }
};

export const deployStaticApp = async ({
  skipAssets,
  staticAppBuildFolder,
  staticAppAliases,
  acmArnExportedName,
  staticAppEdge,
  stackName: preDefinedStackName,
}: {
  skipAssets: boolean;
  staticAppBuildFolder: string;
  staticAppAliases?: string[];
  acmArnExportedName?: string;
  staticAppEdge: boolean;
  stackName?: string;
}) => {
  log.info(logPrefix, `Staring static app deploy`);

  if (staticAppEdge) {
    log.info(logPrefix, `Static app Edge.`);
  }

  try {
    const [environment, stackName] = await Promise.all([
      getEnvironment(),
      getStackName({ preDefinedStackName }),
    ]);

    log.info(logPrefix, `stackName: ${stackName}`);

    const params = { StackName: stackName };

    const template = getStaticAppTemplate({
      acmArnExportedName,
      environment,
      staticAppAliases,
      staticAppEdge,
    });

    const { Outputs } = await deploy({ params, template });

    if (!skipAssets) {
      const staticAppBucket = await getStaticAppBucket({ stackName });

      if (!staticAppBucket) {
        throw new Error(`Cannot find bucket at ${stackName}`);
      }

      await uploadBuiltAppToS3({ staticAppBuildFolder, staticAppBucket });

      await invalidateCloudFront({ outputs: Outputs });
    }
  } catch (err) {
    log.error(logPrefix, 'An error occurred. Cannot deploy static app');
    log.error(logPrefix, 'Error message: %j', err.message);
    throw err;
  }
};

/* eslint-disable no-template-curly-in-string */
import { CloudFormation, CloudFront } from 'aws-sdk';
import log from 'npmlog';

import { getPackageVersion } from '../../utils';

import { cloudFormation, deploy } from '../cloudFormation';
import { uploadDirectoryToS3, emptyS3Directory } from '../s3';
import { getStackName } from '../stackName';

import { getStaticAppTemplate, CSP } from './staticApp.template';

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
  buildFolder: directory,
  bucket,
}: {
  buildFolder: string;
  bucket: string;
}) => {
  const version = getPackageVersion();
  await emptyS3Directory({ bucket, directory: version });
  await uploadDirectoryToS3({ bucket, bucketKey: version, directory });
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
 * # Deploy static app performs these steps:
 *
 * 1. Get the stack name that will be passed to CloudFormation.
 * 2. Create a CloudFormation template based on the type of the deployment,
 *    for instance, only S3, SPA...
 * 3. Create AWS resources using the templated created.
 * 4. Upload static files to the host bucket S3.
 * 5. If is a CloudFront deployment, an CloudFront invalidation will be
 *    created.
 */
export const deployStaticApp = async ({
  acmArn,
  aliases,
  buildFolder,
  cloudfront,
  gtmId,
  csp,
  spa,
  hostedZoneName,
  region,
}: {
  acmArn?: string;
  aliases?: string[];
  buildFolder: string;
  cloudfront: boolean;
  gtmId?: string;
  csp?: CSP;
  spa: boolean;
  hostedZoneName?: string;
  region: string;
}) => {
  log.info(logPrefix, `Starting static app deploy...`);
  try {
    const stackName = await getStackName();

    log.info(logPrefix, `stackName: ${stackName}`);

    const params = { StackName: stackName };

    const template = getStaticAppTemplate({
      acmArn,
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
      await uploadBuiltAppToS3({ buildFolder, bucket });

      const { Outputs } = await deploy({ params, template });

      await invalidateCloudFront({ outputs: Outputs });
      /**
       * Stack doesn't exist. Deploy CloudFormation first, get the bucket name,
       * and upload files to S3.
       */
    } else {
      await deploy({ params, template });

      const newBucket = await getStaticAppBucket({ stackName });

      if (!newBucket) {
        throw new Error(`Cannot find bucket at ${stackName}`);
      }

      await uploadBuiltAppToS3({ buildFolder, bucket: newBucket });
    }
  } catch (err) {
    log.error(logPrefix, 'An error occurred. Cannot deploy static app');
    log.error(logPrefix, 'Error message: %j', err.message);
    process.exit();
  }
};

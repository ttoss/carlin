/* eslint-disable no-template-curly-in-string */
import { CloudFormation, CloudFront } from 'aws-sdk';
import log from 'npmlog';

import { cloudFormation, deploy } from '../cloudFormation';
import { uploadDirectoryToS3, emptyS3Directory } from '../s3';
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
  buildFolder: directory,
  bucket,
}: {
  buildFolder: string;
  bucket: string;
}) => {
  await emptyS3Directory({ bucket });
  await uploadDirectoryToS3({ bucket, directory });
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
 * 5. If is a SPA and has CloudFront, an CloudFront invalidation will be
 *    created.
 */
export const deployStaticApp = async ({
  acmArn,
  acmArnExportedName,
  aliases,
  buildFolder,
  cloudfront,
  scp,
  spa,
  hostedZoneName,
}: {
  acmArn?: string;
  acmArnExportedName?: string;
  aliases?: string[];
  buildFolder: string;
  cloudfront: boolean;
  scp?: string[];
  spa: boolean;
  hostedZoneName?: string;
}) => {
  log.info(logPrefix, `Starting static app deploy...`);
  try {
    const stackName = await getStackName();

    log.info(logPrefix, `stackName: ${stackName}`);

    const params = { StackName: stackName };

    const template = getStaticAppTemplate({
      acmArn,
      acmArnExportedName,
      aliases,
      cloudfront,
      scp,
      spa,
      hostedZoneName,
    });

    const { Outputs } = await deploy({ params, template });

    const bucket = await getStaticAppBucket({ stackName });

    if (!bucket) {
      throw new Error(`Cannot find bucket at ${stackName}`);
    }

    await uploadBuiltAppToS3({ buildFolder, bucket });

    if (spa) {
      await invalidateCloudFront({ outputs: Outputs });
    }
  } catch (err) {
    log.error(logPrefix, 'An error occurred. Cannot deploy static app');
    log.error(logPrefix, 'Error message: %j', err.message);
    process.exit();
  }
};

import AdmZip from 'adm-zip';
import log from 'npmlog';
import path from 'path';

import { CloudFormationTemplate } from '../utils/cloudFormationTemplate';
import { exec } from '../utils/exec';

import { getBaseStackBucketName } from './baseStack/getBaseStackBucketName';
import { deploy } from './cloudFormation';
import { uploadFileToS3 } from './s3';
import { getStackName } from './stackName';

const logPrefix = 'lambda-layer';

const createNodeModules = async () => {
  log.info(logPrefix, 'Re-installing node_modules...');
  await exec('rm -rf node_modules');
  await exec('npm install --no-package-lock --no-optional --only=prod');
};

export const getZipNodeModules = async () => {
  log.info(logPrefix, 'Zipping node_modules...');
  await createNodeModules();
  const zip = new AdmZip();
  /**
   * https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html#configuration-layers-path
   */
  zip.addLocalFolder('node_modules', 'nodejs/node_modules');
  return zip.toBuffer();
};

/**
 * The CloudFormation template created to deploy a Lambda Layer.
 *
 * - The Description fields of the Output and the LambdaLayer resource use the
 * name and version of the package.json dependencies and is limited to a limit
 * defined by: {@link https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-layerversion.html#cfn-lambda-layerversion-description}
 * - The Layer name is the same as the Stack name.
 */
export const getLambdaLayerTemplate = (): CloudFormationTemplate => {
  const { dependencies } = (() => {
    try {
      // eslint-disable-next-line global-require, import/no-dynamic-require
      return require(path.resolve(process.cwd(), 'package.json')) || {};
    } catch (err) {
      return {};
    }
  })();

  const description = Object.entries(dependencies)
    .map(([pkg, version]) => `${pkg} (${version})`)
    .join('; ')
    /**
     * Description has limit of 256.
     * https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-layerversion.html#cfn-lambda-layerversion-description
     */
    .substring(0, 256);

  return {
    AWSTemplateFormatVersion: '2010-09-09',
    Parameters: {
      S3Bucket: {
        Type: 'String',
      },
      S3Key: {
        Type: 'String',
      },
      S3ObjectVersion: {
        Type: 'String',
        Default: 'false',
      },
    },
    Resources: {
      LambdaLayer: {
        Type: 'AWS::Lambda::LayerVersion',
        Properties: {
          CompatibleRuntimes: ['nodejs12.x'],
          Content: {
            S3Bucket: { Ref: 'S3Bucket' },
            S3Key: { Ref: 'S3Key' },
            S3ObjectVersion: { Ref: 'S3ObjectVersion' },
          },
          Description: description,
          LayerName: { Ref: 'AWS::StackName' },
        },
      },
    },
    Outputs: {
      LambdaLayerVersion: {
        Description: description,
        Value: { Ref: 'LambdaLayer' },
      },
    },
  };
};

/**
 * The steps followed when deploying a Lambda Layer are:
 *
 *    1. Remove the package node_nodules.
 *    2. Install node_modules again with the current packages on package.json.
 *    3. Zip node_modules folder.
 *    4. Upload the zipped file to Carlin bucket S3.
 *    5. Deploy the Lambda Layer CloudFormation template referencing the
 *    uploaded zipper folder on Carlin bucket S3.
 */
export const deployLambdaLayer = async () => {
  log.info(logPrefix, `Starting Lambda Layer deploy...`);
  const stackName = await getStackName();
  const zip = await getZipNodeModules();
  const { bucket, key, versionId } = await uploadFileToS3({
    bucket: await getBaseStackBucketName(),
    contentType: 'application/zip' as any,
    key: `lambda-layer/${stackName}/layer.zip`,
    file: zip,
  });
  const template = getLambdaLayerTemplate();
  return deploy({
    template,
    params: {
      Parameters: [
        { ParameterKey: 'S3Bucket', ParameterValue: bucket },
        { ParameterKey: 'S3Key', ParameterValue: key },
        { ParameterKey: 'S3ObjectVersion', ParameterValue: versionId },
      ],
      StackName: stackName,
    },
  });
};

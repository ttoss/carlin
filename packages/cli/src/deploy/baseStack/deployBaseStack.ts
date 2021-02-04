import log from 'npmlog';

import { CloudFormationTemplate } from '../../utils';

import { deploy } from '../cloudFormation';

import {
  BASE_STACK_BUCKET_LOGICAL_NAME,
  BASE_STACK_BUCKET_NAME_EXPORTED_NAME,
  BASE_STACK_BUCKET_TEMPLATES_FOLDER,
  BASE_STACK_NAME,
} from './config';

const logPrefix = 'baseStack';

export const baseStackTemplate: CloudFormationTemplate = {
  AWSTemplateFormatVersion: '2010-09-09',
  Parameters: {
    TemplatesFolder: {
      Default: BASE_STACK_BUCKET_TEMPLATES_FOLDER,
      Type: 'String',
    },
  },
  Resources: {
    [BASE_STACK_BUCKET_LOGICAL_NAME]: {
      Type: 'AWS::S3::Bucket',
      DeletionPolicy: 'Retain',
      Properties: {
        LifecycleConfiguration: {
          Rules: [
            {
              ExpirationInDays: 1,
              Prefix: { Ref: 'TemplatesFolder' },
              Status: 'Enabled',
            },
            {
              NoncurrentVersionExpirationInDays: 3,
              Status: 'Enabled',
            },
          ],
        },
        /**
         * This is necessary because if we update Lambda code without change
         * CloudFormation template, the Lambda will not be updated.
         */
        VersioningConfiguration: {
          Status: 'Enabled',
        },
      },
    },
  },
  Outputs: {
    [BASE_STACK_BUCKET_LOGICAL_NAME]: {
      Value: { Ref: BASE_STACK_BUCKET_LOGICAL_NAME },
      Export: {
        Name: BASE_STACK_BUCKET_NAME_EXPORTED_NAME,
      },
    },
  },
};

/**
 * Currently, base stack only creates a S3 bucket, whose role is to serve as a
 * deploy helper. Every deploy process may need some base resources to be
 * succeed. For instance, to deploy resources that contain a
 * [Lambda](https://carlin.ttoss.dev/docs/Commands/deploy#lambda), we need a S3
 * bucket to upload the zipped code. Or if the CloudFormation template has a
 * size greater than [the limit](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cloudformation-limits.html),
 * we need to upload the template to a S3 bucket in order to create/update the
 * stack.
 */
export const deployBaseStack = async () => {
  try {
    log.info(logPrefix, 'Creating base stack...');
    await deploy({
      template: baseStackTemplate,
      params: { StackName: BASE_STACK_NAME },
      terminationProtection: true,
    });
  } catch (err) {
    log.error(logPrefix, 'Cannot deploy base stack.');
    log.error(logPrefix, 'Error message: %j', err.message);
    process.exit();
  }
};

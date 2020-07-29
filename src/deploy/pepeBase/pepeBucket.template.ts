import { CloudFormationTemplate } from '../../utils';

import { PEPE_BUCKET_TEMPLATES_FOLDER } from '../../config';

export const template: CloudFormationTemplate = {
  AWSTemplateFormatVersion: '2010-09-09',

  Parameters: {
    TemplatesFolder: {
      Default: PEPE_BUCKET_TEMPLATES_FOLDER,
      Type: 'String',
    },
  },

  Resources: {
    PepeBucket: {
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
          ],
        },
      },
    },
  },

  Outputs: {
    PepeBucketName: {
      Value: { Ref: 'PepeBucket' },
      Export: {
        Name: 'PepeBucketName',
      },
    },

    PepeBucketStackName: {
      Value: { Ref: 'AWS::StackName' },
      Export: {
        Name: 'PepeBucketStackName',
      },
    },
  },
};

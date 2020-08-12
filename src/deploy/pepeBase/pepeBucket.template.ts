import { CloudFormationTemplate } from '../../utils';

import {
  PEPE_BUCKET_LOGICAL_NAME,
  PEPE_BUCKET_NAME_EXPORTED_NAME,
  PEPE_BUCKET_TEMPLATES_FOLDER,
} from './config';

export const template: CloudFormationTemplate = {
  AWSTemplateFormatVersion: '2010-09-09',
  Parameters: {
    TemplatesFolder: {
      Default: PEPE_BUCKET_TEMPLATES_FOLDER,
      Type: 'String',
    },
  },
  Resources: {
    [PEPE_BUCKET_LOGICAL_NAME]: {
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
    [PEPE_BUCKET_LOGICAL_NAME]: {
      Value: { Ref: PEPE_BUCKET_LOGICAL_NAME },
      Export: {
        Name: PEPE_BUCKET_NAME_EXPORTED_NAME,
      },
    },
  },
};

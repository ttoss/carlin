import yaml from 'js-yaml';

import { CloudFormationTemplate, getIamPath } from '../../utils';

import { deploy } from '../cloudFormation.core';
import { handleDeployError, handleDeployInitialization } from '../utils';

import {
  BASE_STACK_NAME,
  BASE_STACK_BUCKET_LOGICAL_NAME,
  BASE_STACK_BUCKET_NAME_EXPORTED_NAME,
  BASE_STACK_BUCKET_TEMPLATES_FOLDER,
  BASE_STACK_LAMBDA_IMAGE_BUILDER_EXPORTED_NAME,
  BASE_STACK_LAMBDA_IMAGE_BUILDER_LOGICAL_NAME,
} from './config';

import { getLambdaLayerBuilderTemplate } from './getLambdaLayerBuilder.template';

const logPrefix = 'base-stack';

const bucketResource = {
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
};

const lambdaImageBuilderResource = (() => {
  const CODE_BUILD_PROJECT_LOGS_LOGICAL_ID = 'CodeBuildProjectLogsLogGroup';

  const CODE_BUILD_PROJECT_SERVICE_ROLE_LOGICAL_ID =
    'ImageCodeBuildProjectIAMRole';

  return {
    [CODE_BUILD_PROJECT_LOGS_LOGICAL_ID]: {
      Type: 'AWS::Logs::LogGroup',
      DeletionPolicy: 'Delete',
      Properties: {},
    },
    [CODE_BUILD_PROJECT_SERVICE_ROLE_LOGICAL_ID]: {
      Type: 'AWS::IAM::Role',
      Properties: {
        AssumeRolePolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: 'codebuild.amazonaws.com',
              },
              Action: 'sts:AssumeRole',
            },
          ],
        },
        Path: getIamPath(),
        Policies: [
          {
            PolicyName: `${CODE_BUILD_PROJECT_SERVICE_ROLE_LOGICAL_ID}Policy`,
            PolicyDocument: {
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Action: ['logs:CreateLogStream', 'logs:PutLogEvents'],
                  Resource: '*',
                },
                {
                  Effect: 'Allow',
                  Action: ['ecr:GetAuthorizationToken'],
                  Resource: '*',
                },
                {
                  Effect: 'Allow',
                  Action: [
                    'ecr:BatchCheckLayerAvailability',
                    'ecr:CompleteLayerUpload',
                    'ecr:InitiateLayerUpload',
                    'ecr:PutImage',
                    'ecr:UploadLayerPart',
                  ],
                  Resource: '*',
                },
                {
                  Effect: 'Allow',
                  Action: 's3:GetObject',
                  Resource: [
                    {
                      'Fn::Sub': [
                        // eslint-disable-next-line no-template-curly-in-string
                        'arn:aws:s3:::${BucketName}/*',
                        {
                          BucketName: {
                            Ref: BASE_STACK_BUCKET_LOGICAL_NAME,
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
    },
    [BASE_STACK_LAMBDA_IMAGE_BUILDER_LOGICAL_NAME]: {
      Type: 'AWS::CodeBuild::Project',
      Properties: {
        Artifacts: {
          Type: 'NO_ARTIFACTS',
        },
        Cache: {
          Location: 'LOCAL',
          Modes: ['LOCAL_DOCKER_LAYER_CACHE'],
          Type: 'LOCAL',
        },
        Description: 'Create Lambda image.',
        Environment: {
          ComputeType: 'BUILD_GENERAL1_SMALL',
          EnvironmentVariables: [
            {
              Name: 'AWS_ACCOUNT_ID',
              Value: { Ref: 'AWS::AccountId' },
            },
            {
              Name: 'AWS_REGION',
              Value: { Ref: 'AWS::Region' },
            },
            {
              Name: 'IMAGE_TAG',
              Value: 'latest',
            },
            {
              Name: 'LAMBDA_EXTERNALS',
              Value: '',
            },
          ],
          Image: 'aws/codebuild/standard:3.0',
          ImagePullCredentialsType: 'CODEBUILD',
          PrivilegedMode: true,
          Type: 'LINUX_CONTAINER',
        },
        LogsConfig: {
          CloudWatchLogs: {
            Status: 'ENABLED',
            GroupName: { Ref: CODE_BUILD_PROJECT_LOGS_LOGICAL_ID },
          },
        },
        ServiceRole: {
          'Fn::GetAtt': [CODE_BUILD_PROJECT_SERVICE_ROLE_LOGICAL_ID, 'Arn'],
        },
        Source: {
          BuildSpec: yaml.safeDump({
            version: '0.2',
            phases: {
              install: {
                commands: [
                  'echo install started on `date`',
                  'npm init -y',
                  /**
                   * https://stackoverflow.com/a/51433146/8786986
                   */
                  'npm install --save --package-lock-only --no-package-lock $LAMBDA_EXTERNALS',
                  'ls',
                ],
              },
              pre_build: {
                commands: [
                  'echo pre_build started on `date`',
                  '$(aws ecr get-login --no-include-email --region $AWS_REGION)',
                ],
              },
              build: {
                commands: [
                  'echo build started on `date`',
                  'echo Building the repository image...',
                  'echo "$DOCKERFILE" > Dockerfile',
                  'docker build -t $REPOSITORY_ECR_REPOSITORY:$IMAGE_TAG -f Dockerfile .',
                  'docker tag $REPOSITORY_ECR_REPOSITORY:$IMAGE_TAG $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPOSITORY_ECR_REPOSITORY:$IMAGE_TAG',
                ],
              },
              post_build: {
                commands: [
                  'echo post_build completed on `date`',
                  'echo Pushing the repository image...',
                  'docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPOSITORY_ECR_REPOSITORY:$IMAGE_TAG',
                ],
              },
            },
          }),
          Type: 'NO_SOURCE',
        },
        TimeoutInMinutes: 60,
      },
    },
  };
})();

export const baseStackTemplate: CloudFormationTemplate = {
  AWSTemplateFormatVersion: '2010-09-09',
  Parameters: {
    TemplatesFolder: {
      Default: BASE_STACK_BUCKET_TEMPLATES_FOLDER,
      Type: 'String',
    },
  },
  Resources: {
    ...bucketResource,
    ...lambdaImageBuilderResource,
    ...getLambdaLayerBuilderTemplate().Resources,
  },
  Outputs: {
    [BASE_STACK_BUCKET_LOGICAL_NAME]: {
      Value: { Ref: BASE_STACK_BUCKET_LOGICAL_NAME },
      Export: {
        Name: BASE_STACK_BUCKET_NAME_EXPORTED_NAME,
      },
    },
    [BASE_STACK_LAMBDA_IMAGE_BUILDER_LOGICAL_NAME]: {
      Value: { Ref: BASE_STACK_LAMBDA_IMAGE_BUILDER_LOGICAL_NAME },
      Export: {
        Name: BASE_STACK_LAMBDA_IMAGE_BUILDER_EXPORTED_NAME,
      },
    },
    ...getLambdaLayerBuilderTemplate().Outputs,
  },
};

/**
 * Base Stack is a set of auxiliary resources that will be used to help at the
 * deployment time. The resources that will be created are listed below.
 *
 * - **S3 bucket**. Deployment may need an auxiliary bucket to succeed. For
 * instance, to deploy resources that contain a
 * [Lambda](https://carlin.ttoss.dev/docs/commands/deploy#lambda), we need a S3
 * bucket to upload the zipped code. Or if the CloudFormation template has a
 * size greater than [the limit](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cloudformation-limits.html),
 * we need to upload the template to a S3 bucket in order to create/update the
 * stack.
 *
 * - **Lambda Layer builder**. This resource is a CodeBuild project that is
 * used to create Lambda Layers when [--lambda-externals](/docs/api-reference/deploy#lambda-externals)
 * has values.
 *
 * - **Lambda Image builder**. This resource is a CodeBuild project that builds
 * Docker Images if Lambda is going to use them.
 */
export const deployBaseStack = async () => {
  try {
    const { stackName } = await handleDeployInitialization({
      logPrefix,
      stackName: BASE_STACK_NAME,
    });

    await deploy({
      template: baseStackTemplate,
      params: { StackName: stackName },
      terminationProtection: true,
    });
  } catch (error) {
    handleDeployError({ error, logPrefix });
  }
};

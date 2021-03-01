import { CloudFormationTemplate, getIamPath } from '../../utils';

const CODE_BUILD_PROJECT_LOGICAL_ID = 'LambdaLayerCodeBuildProject';

const CODE_BUILD_PROJECT_LOGS_GROUP_LOGICAL_ID = `${CODE_BUILD_PROJECT_LOGICAL_ID}LogsLogGroup`;

const CODE_BUILD_PROJECT_IAM_ROLE_LOGICAL_ID =
  'LambdaLayerCodeBuildProjectRole';

export const PROJECT_NAME_OUTPUT_KEY = 'ProjectName';

/**
 * https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html
 */
export const getBuildSpec = ({ packageName }: { packageName: string }) =>
  `
version: 0.2
phases:
  install:
    runtime-versions:
      nodejs: 12.x
    commands:
      - npm i --no-package-lock --no-optional --only=prod ${packageName}
      - mkdir nodejs
      - mv node_modules nodejs/node_modules
artifacts:
  files:
    - nodejs/**/*
  name: ${packageName}.zip
`.trim();

/**
 * https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-codebuild-project.html
 */
export const getCodeBuildTemplate = ({
  baseBucketName,
}: {
  baseBucketName: string;
}): CloudFormationTemplate => {
  return {
    AWSTemplateFormatVersion: '2010-09-09',
    Resources: {
      [CODE_BUILD_PROJECT_IAM_ROLE_LOGICAL_ID]: {
        Type: 'AWS::IAM::Role',
        Properties: {
          AssumeRolePolicyDocument: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: {
                  Service: ['codebuild.amazonaws.com'],
                },
                Action: ['sts:AssumeRole'],
              },
            ],
          },
          Path: getIamPath(),
          Policies: [
            {
              PolicyName: `${CODE_BUILD_PROJECT_IAM_ROLE_LOGICAL_ID}Policy`,
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
                    Action: ['s3:*'],
                    Resource: [
                      `arn:aws:s3:::${baseBucketName}`,
                      `arn:aws:s3:::${baseBucketName}/*`,
                    ],
                  },
                ],
              },
            },
          ],
        },
      },
      [CODE_BUILD_PROJECT_LOGS_GROUP_LOGICAL_ID]: {
        Type: 'AWS::Logs::LogGroup',
        DeletionPolicy: 'Delete',
        Properties: {},
      },
      [CODE_BUILD_PROJECT_LOGICAL_ID]: {
        Type: 'AWS::CodeBuild::Project',
        Properties: {
          Artifacts: {
            Location: baseBucketName,
            NamespaceType: 'NONE',
            OverrideArtifactName: true,
            Packaging: 'ZIP',
            Path: 'lambda-layers/packages',
            Type: 'S3',
          },
          Environment: {
            ComputeType: 'BUILD_GENERAL1_SMALL',
            Image: 'aws/codebuild/standard:3.0',
            Type: 'LINUX_CONTAINER',
          },
          LogsConfig: {
            CloudWatchLogs: {
              GroupName: {
                Ref: `${CODE_BUILD_PROJECT_LOGS_GROUP_LOGICAL_ID}`,
              },
              Status: 'ENABLED',
            },
          },
          ServiceRole: {
            'Fn::GetAtt': `${CODE_BUILD_PROJECT_IAM_ROLE_LOGICAL_ID}.Arn`,
          },
          Source: {
            BuildSpec: getBuildSpec({ packageName: '' }),
            Type: 'NO_SOURCE',
          },
        },
      },
    },
    Outputs: {
      [PROJECT_NAME_OUTPUT_KEY]: {
        Value: { Ref: CODE_BUILD_PROJECT_LOGICAL_ID },
      },
    },
  };
};

import yaml from 'js-yaml';

import { CloudFormationTemplate, getIamPath } from '../../utils';

export const getCicdTemplate = (): CloudFormationTemplate => {
  const resources: CloudFormationTemplate['Resources'] = {};

  const ECR_REPOSITORY_LOGICAL_ID = 'RepositoryECRRepository';

  /**
   * Elastic Container Registry
   */
  resources[ECR_REPOSITORY_LOGICAL_ID] = {
    Type: 'AWS::ECR::Repository',
    Properties: {
      LifecyclePolicy: {
        LifecyclePolicyText: JSON.stringify({
          rules: [
            {
              rulePriority: 1,
              description: 'Only keep the latest image',
              selection: {
                tagStatus: 'any',
                countType: 'imageCountMoreThan',
                countNumber: 1,
              },
              action: {
                type: 'expire',
              },
            },
          ],
        }),
      },
    },
  };

  /**
   * CodeBuild
   */
  (() => {
    const CODE_BUILD_PROJECT_LOGS_LOGICAL_ID =
      'RepositoryImageCodeBuildProjectLogsLogGroup';

    const CODE_BUILD_PROJECT_SERVICE_ROLE_LOGICAL_ID =
      'RepositoryImageCodeBuildProjectIAMRole';

    resources[CODE_BUILD_PROJECT_LOGS_LOGICAL_ID] = {
      Type: 'AWS::Logs::LogGroup',
      DeletionPolicy: 'Delete',
      Properties: {},
    };

    resources[CODE_BUILD_PROJECT_SERVICE_ROLE_LOGICAL_ID] = {
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
                  Resource: {
                    'Fn::GetAtt': [ECR_REPOSITORY_LOGICAL_ID, 'Arn'],
                  },
                },
              ],
            },
          },
        ],
      },
    };

    resources.RepositoryImageCodeBuildProject = {
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
        Description: 'Create repository image.',
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
              Name: 'DOCKERFILE',
              Value: {
                'Fn::Sub': [
                  'FROM ubuntu:latest',
                  '# make sure apt is up to date',
                  'RUN apt-get update --fix-missing',
                ].join('\n'),
              },
            },
            {
              Name: 'IMAGE_TAG',
              Value: 'latest',
            },
            {
              Name: 'REPOSITORY_ECR_REPOSITORY',
              Value: { Ref: ECR_REPOSITORY_LOGICAL_ID },
            },
            {
              Name: 'SSH_KEY',
              Value: { Ref: 'SSHKey' },
            },
            {
              Name: 'REPOSITORY',
              Value: { Ref: 'Repository' },
            },
          ],
          Image: 'aws/codebuild/standard:3.0',
          ImagePullCredentialsType: 'CODEBUILD',
          /**
           * Enables running the Docker daemon inside a Docker container. Set to
           * true only if the build project is used to build Docker images.
           * Otherwise, a build that attempts to interact with the Docker daemon
           * fails. The default setting is false."
           * https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-codebuild-project-environment.html#cfn-codebuild-project-environment-privilegedmode
           */
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
                  `echo "$SSH_KEY" > ~/.ssh/id_rsa`,
                  'chmod 600 ~/.ssh/id_rsa',
                  'rm -rf repository',
                  'git clone $REPOSITORY repository',
                  'npm install -g yarn',
                  'mkdir -p yarn-cache',
                  'yarn config set cache-folder ./yarn-cache',
                  'cd repository',
                  'ls',
                  'yarn install',
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
                  'cd ../',
                  'echo "$DOCKERFILE" > Dockerfile',
                  'cat Dockerfile',
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
    };
  })();

  return {
    AWSTemplateFormatVersion: '2010-09-09',
    Resources: resources,
    Parameters: {
      Repository: {
        Type: 'String',
      },
      SSHKey: {
        NoEcho: true,
        Type: 'String',
      },
    },
  };
};

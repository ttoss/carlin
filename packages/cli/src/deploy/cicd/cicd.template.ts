import yaml from 'js-yaml';

import { CloudFormationTemplate, getIamPath } from '../../utils';

export const API_LOGICAL_ID = 'ApiV1ServerlessApi';

export const CODE_BUILD_PROJECT_LOGS_LOGICAL_ID =
  'RepositoryImageCodeBuildProjectLogsLogGroup';

export const CODE_BUILD_PROJECT_SERVICE_ROLE_LOGICAL_ID =
  'RepositoryImageCodeBuildProjectIAMRole';

export const ECR_REPOSITORY_LOGICAL_ID = 'RepositoryECRRepository';

export const FUNCTION_IAM_ROLE_LOGICAL_ID = 'ApiV1ServerlessFunctionIAMRole';

export const PROCESS_ENV_REPOSITORY_IMAGE_CODE_BUILD_PROJECT_NAME =
  'REPOSITORY_IMAGE_CODE_BUILD_PROJECT_NAME';

export const REPOSITORY_ECS_TASK_CONTAINER_NAME =
  'RepositoryECSTaskContainerName';

export const REPOSITORY_ECS_TASK_DEFINITION_LOGICAL_ID =
  'RepositoryECSTaskDefinition';

export const REPOSITORY_IMAGE_CODE_BUILD_PROJECT_LOGICAL_ID =
  'RepositoryImageCodeBuildProject';

export const REPOSITORY_TASKS_ECS_CLUSTER_LOGICAL_ID =
  'RepositoryTasksECSCluster';

export const REPOSITORY_TASKS_ECS_CLUSTER_LOGS_LOG_GROUP_LOGICAL_ID =
  'RepositoryTasksECSClusterLogsLogGroup';

export const REPOSITORY_TASKS_ECS_TASK_DEFINITION_EXECUTION_ROLE_LOGICAL_ID =
  'RepositoryTasksECSTaskDefinitionExecutionRoleIAMRole';

export const REPOSITORY_TASKS_ECS_TASK_DEFINITION_TASK_ROLE_LOGICAL_ID =
  'RepositoryTasksECSTaskDefinitionTaskRoleIAMRole';

const apiProxyHandlerLambdaCode = `
const AWS = require('aws-sdk');

const codebuild = new AWS.CodeBuild({ apiVersion: '2016-10-06' });

exports.proxyHandler =  async function(event, context) {
  try {
    const body = JSON.parse(event.body);

    if(body.action === 'updateRepository') {
      const startBuildResponse = await codebuild.startBuild({
        projectName: process.env.${PROCESS_ENV_REPOSITORY_IMAGE_CODE_BUILD_PROJECT_NAME}
      }).promise();

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(startBuildResponse),
      };  
    }

    return {
      statusCode: 403,
      body: 'Execute access forbidden',
    };
  } catch(err) {
    return {
      statusCode: 400,
      body: err.message,
    };
  }
}
`;

export const getCicdTemplate = (): CloudFormationTemplate => {
  const resources: CloudFormationTemplate['Resources'] = {};

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

    resources[REPOSITORY_IMAGE_CODE_BUILD_PROJECT_LOGICAL_ID] = {
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

                  '# Clean cache',
                  'RUN apt-get clean',

                  '# Configure git',
                  'RUN git config --global user.name carlin',
                  'RUN git config --global user.email carlin@ttoss.dev',

                  '# Copy repository',
                  'COPY . /home/monorepo',

                  '# Go to repository directory',
                  'WORKDIR /home/monorepo',

                  '# Set Yarn cache',
                  'RUN yarn config set cache-folder /home/monorepo/yarn-cache',
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
              Name: 'SSH_URL',
              Value: { Ref: 'SSHUrl' },
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
                  'git clone $SSH_URL repository',
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

  /**
   * API
   */
  (() => {
    resources[API_LOGICAL_ID] = {
      Type: 'AWS::Serverless::Api',
      Properties: {
        Auth: {
          ApiKeyRequired: false,
        },
        StageName: 'v1',
      },
    };

    resources[FUNCTION_IAM_ROLE_LOGICAL_ID] = {
      Type: 'AWS::IAM::Role',
      Properties: {
        AssumeRolePolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: 'lambda.amazonaws.com',
              },
              Action: ['sts:AssumeRole'],
            },
          ],
        },
        ManagedPolicyArns: [
          'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
        ],
        Policies: [
          {
            PolicyName: `${FUNCTION_IAM_ROLE_LOGICAL_ID}Policy`,
            PolicyDocument: {
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Action: ['codebuild:StartBuild'],
                  Resource: {
                    'Fn::GetAtt': [
                      REPOSITORY_IMAGE_CODE_BUILD_PROJECT_LOGICAL_ID,
                      'Arn',
                    ],
                  },
                },
              ],
            },
          },
        ],
        Path: getIamPath(),
      },
    };

    resources.ApiV1ServerlessFunction = {
      Type: 'AWS::Serverless::Function',
      Properties: {
        Events: {
          ApiEvent: {
            Type: 'Api',
            Properties: {
              Method: 'POST',
              Path: '/cicd',
              RestApiId: { Ref: API_LOGICAL_ID },
            },
          },
        },
        Environment: {
          Variables: {
            [PROCESS_ENV_REPOSITORY_IMAGE_CODE_BUILD_PROJECT_NAME]: {
              Ref: REPOSITORY_IMAGE_CODE_BUILD_PROJECT_LOGICAL_ID,
            },
          },
        },
        Handler: 'index.proxyHandler',
        InlineCode: apiProxyHandlerLambdaCode,
        Role: {
          'Fn::GetAtt': [FUNCTION_IAM_ROLE_LOGICAL_ID, 'Arn'],
        },
        Runtime: 'nodejs12.x',
        Timeout: 60,
      },
    };
  })();

  /**
   * ECS
   */
  (() => {
    resources[REPOSITORY_TASKS_ECS_CLUSTER_LOGICAL_ID] = {
      Type: 'AWS::ECS::Cluster',
      Properties: {},
    };

    resources[REPOSITORY_TASKS_ECS_CLUSTER_LOGS_LOG_GROUP_LOGICAL_ID] = {
      Type: 'AWS::Logs::LogGroup',
      DeletionPolicy: 'Delete',
      Properties: {},
    };

    /**
     * Used to start the container.
     */
    resources[
      REPOSITORY_TASKS_ECS_TASK_DEFINITION_EXECUTION_ROLE_LOGICAL_ID
    ] = {
      Type: 'AWS::IAM::Role',
      Properties: {
        AssumeRolePolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: 'ecs-tasks.amazonaws.com',
              },
              Action: 'sts:AssumeRole',
            },
          ],
        },
        ManagedPolicyArns: [
          'arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy',
        ],
        Path: getIamPath(),
      },
    };

    /**
     * Used inside de container execution.
     */
    resources[REPOSITORY_TASKS_ECS_TASK_DEFINITION_TASK_ROLE_LOGICAL_ID] = {
      Type: 'AWS::IAM::Role',
      Properties: {
        AssumeRolePolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: 'ecs-tasks.amazonaws.com',
              },
              Action: 'sts:AssumeRole',
            },
          ],
        },
        ManagedPolicyArns: [
          'arn:aws:iam::aws:policy/job-function/ViewOnlyAccess',
        ],
        Path: getIamPath(),
        // Policies: null,
      },
    };

    resources[REPOSITORY_ECS_TASK_DEFINITION_LOGICAL_ID] = {
      Type: 'AWS::ECS::TaskDefinition',
      Properties: {
        ContainerDefinitions: [
          {
            Environment: [
              {
                /**
                 * https://docs.aws.amazon.com/AmazonECS/latest/developerguide/container-metadata.html#enable-metadata
                 */
                Name: 'ECS_ENABLE_CONTAINER_METADATA',
                Value: 'true',
              },
            ],
            Image: {
              'Fn::Sub': [
                // eslint-disable-next-line no-template-curly-in-string
                '${AWS::AccountId}.dkr.ecr.${AWS::Region}.amazonaws.com/${RepositoryECR}:latest',
                {
                  RepositoryECR: { Ref: ECR_REPOSITORY_LOGICAL_ID },
                },
              ],
            },
            LogConfiguration: {
              LogDriver: 'awslogs',
              Options: {
                'awslogs-group': {
                  Ref: REPOSITORY_TASKS_ECS_CLUSTER_LOGS_LOG_GROUP_LOGICAL_ID,
                },
                'awslogs-region': { Ref: 'AWS::Region' },
                'awslogs-stream-prefix': 'ecs',
              },
            },
            Name: REPOSITORY_ECS_TASK_CONTAINER_NAME,
          },
        ],
        Cpu: 1024,
        ExecutionRoleArn: {
          'Fn::GetAtt': [
            REPOSITORY_TASKS_ECS_TASK_DEFINITION_EXECUTION_ROLE_LOGICAL_ID,
            'Arn',
          ],
        },
        Memory: 2048,
        NetworkMode: 'awsvpc',
        RequiresCompatibilities: ['FARGATE'],
      },
    };
  })();

  return {
    AWSTemplateFormatVersion: '2010-09-09',
    Transform: 'AWS::Serverless-2016-10-31',
    Resources: resources,
    Parameters: {
      SSHKey: {
        NoEcho: true,
        Type: 'String',
      },
      SSHUrl: {
        Type: 'String',
      },
    },
    Outputs: {
      ApiV1Endpoint: {
        Description: 'API v1 stage endpoint.',
        Value: {
          'Fn::Sub': `https://\${${API_LOGICAL_ID}}.execute-api.\${AWS::Region}.amazonaws.com/v1/`,
        },
      },
    },
  };
};

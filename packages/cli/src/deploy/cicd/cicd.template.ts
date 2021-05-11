import yaml from 'js-yaml';

import { CloudFormationTemplate, getIamPath } from '../../utils';

import {
  BASE_STACK_BUCKET_NAME_EXPORTED_NAME,
  BASE_STACK_VPC_DEFAULT_SECURITY_GROUP_EXPORTED_NAME,
  BASE_STACK_VPC_PUBLIC_SUBNET_0_EXPORTED_NAME,
  BASE_STACK_VPC_PUBLIC_SUBNET_1_EXPORTED_NAME,
  BASE_STACK_VPC_PUBLIC_SUBNET_2_EXPORTED_NAME,
} from '../baseStack/config';

import type { Pipeline } from './pipelines';
import { ECS_TASK_DEFAULT_CPU, ECS_TASK_DEFAULT_MEMORY } from './config';

import {
  getTriggerPipelinesObjectKey,
  TRIGGER_PIPELINES_OBJECT_KEY_PREFIX,
} from './getTriggerPipelineObjectKey';

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

export const PIPELINES_ARTIFACT_STORE_S3_BUCKET_LOGICAL_ID =
  'PipelinesArtifactStoreS3Bucket';

export const PIPELINES_MAIN_ROLE_LOGICAL_ID = 'PipelinesMainIAMRole';

export const PIPELINES_MAIN_LOGICAL_ID = 'PipelinesMainCodePipeline';

export const PIPELINES_HANDLER_LAMBDA_FUNCTION_LOGICAL_ID =
  'PipelinesHandlerLambdaFunction';

export const getCicdTemplate = ({
  pipelines = [],
  cpu = ECS_TASK_DEFAULT_CPU,
  memory = ECS_TASK_DEFAULT_MEMORY,
  s3,
}: {
  pipelines: Pipeline[];
  cpu?: string;
  memory?: string;
  s3: {
    bucket: string;
    key: string;
    versionId: string;
  };
}): CloudFormationTemplate => {
  const resources: CloudFormationTemplate['Resources'] = {};

  const executeEcsTaskVariables = {
    ECS_CLUSTER_ARN: {
      'Fn::GetAtt': [REPOSITORY_TASKS_ECS_CLUSTER_LOGICAL_ID, 'Arn'],
    },
    ECS_CONTAINER_NAME: REPOSITORY_ECS_TASK_CONTAINER_NAME,
    ECS_TASK_DEFINITION: {
      Ref: REPOSITORY_ECS_TASK_DEFINITION_LOGICAL_ID,
    },
    VPC_SECURITY_GROUP: {
      'Fn::ImportValue': BASE_STACK_VPC_DEFAULT_SECURITY_GROUP_EXPORTED_NAME,
    },
    VPC_PUBLIC_SUBNET_0: {
      'Fn::ImportValue': BASE_STACK_VPC_PUBLIC_SUBNET_0_EXPORTED_NAME,
    },
    VPC_PUBLIC_SUBNET_1: {
      'Fn::ImportValue': BASE_STACK_VPC_PUBLIC_SUBNET_1_EXPORTED_NAME,
    },
    VPC_PUBLIC_SUBNET_2: {
      'Fn::ImportValue': BASE_STACK_VPC_PUBLIC_SUBNET_2_EXPORTED_NAME,
    },
  };

  /**
   * #### Elastic Container Registry
   *
   * The algorithm will clone the repository and will create a Docker image
   * to be used to perform commands. [Yarn cache](https://classic.yarnpkg.com/en/docs/cli/cache/)
   * will also be saved together with the code to reduce tasks installation
   * time. The created image will be pushed to [Amazon Elastic Container Registry](https://aws.amazon.com/ecr/).
   *
   * A expiration rule is also defined. The registry only keeps the latest image.
   */
  const getEcrRepositoryResource = () => ({
    Type: 'AWS::ECR::Repository',
    Properties: {
      LifecyclePolicy: {
        LifecyclePolicyText: JSON.stringify(
          {
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
          },
          null,
          2,
        ),
      },
    },
  });

  resources[ECR_REPOSITORY_LOGICAL_ID] = getEcrRepositoryResource();

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
                  'FROM public.ecr.aws/ubuntu/ubuntu:latest',

                  // https://stackoverflow.com/a/59693182/8786986
                  'ENV DEBIAN_FRONTEND noninteractive',

                  // Make sure apt is up to date
                  'RUN apt-get update --fix-missing',

                  'RUN apt-get install -y curl',
                  'RUN apt-get install -y git',

                  // Install Node.js
                  'RUN curl -sL https://deb.nodesource.com/setup_14.x | bash -',
                  'RUN apt-get install -y nodejs',

                  // Clean cache
                  'RUN apt-get clean',

                  // Install Yarn
                  'RUN npm install -g yarn',

                  // Configure git
                  'RUN git config --global user.name carlin',
                  'RUN git config --global user.email carlin@ttoss.dev',

                  'RUN mkdir /root/.ssh/',
                  'COPY ./id_rsa /root/.ssh/id_rsa',
                  'RUN chmod 600 /root/.ssh/id_rsa',

                  // Make sure your domain is accepted
                  'RUN touch /root/.ssh/known_hosts',
                  'RUN ssh-keyscan github.com >> /root/.ssh/known_hosts',

                  // Copy repository
                  'COPY . /home',

                  // Go to repository directory
                  'WORKDIR /home/repository',

                  // Set Yarn cache
                  'RUN mkdir -p /home/yarn-cache',
                  'RUN yarn config set cache-folder /home/yarn-cache',

                  'RUN yarn install',
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
          BuildSpec: yaml.dump({
            version: '0.2',
            phases: {
              install: {
                commands: [
                  'echo install started on `date`',
                  `echo "$SSH_KEY" > ~/.ssh/id_rsa`,
                  'chmod 600 ~/.ssh/id_rsa',
                  'rm -rf repository',
                  'git clone $SSH_URL repository',
                  'cd repository',
                  'ls',
                ],
              },
              pre_build: {
                commands: ['echo pre_build started on `date`'],
              },
              build: {
                commands: [
                  'echo build started on `date`',
                  '$(aws ecr get-login --no-include-email --region $AWS_REGION)',
                  'echo Building the repository image...',
                  'cd ../',
                  'cp ~/.ssh/id_rsa .',
                  'echo "$DOCKERFILE" > Dockerfile',
                  'cat Dockerfile',
                  'docker build -t $REPOSITORY_ECR_REPOSITORY:$IMAGE_TAG -f Dockerfile .',
                  'docker tag $REPOSITORY_ECR_REPOSITORY:$IMAGE_TAG $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPOSITORY_ECR_REPOSITORY:$IMAGE_TAG',
                  'echo Pushing the repository image...',
                  'docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPOSITORY_ECR_REPOSITORY:$IMAGE_TAG',
                ],
              },
              post_build: {
                commands: ['echo post_build completed on `date`'],
              },
            },
          }),
          Type: 'NO_SOURCE',
        },
        TimeoutInMinutes: 15,
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
        Path: getIamPath(),
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
                {
                  Effect: 'Allow',
                  Action: ['iam:PassRole'],
                  Resource: [
                    {
                      'Fn::GetAtt': [
                        REPOSITORY_TASKS_ECS_TASK_DEFINITION_EXECUTION_ROLE_LOGICAL_ID,
                        'Arn',
                      ],
                    },
                    {
                      'Fn::GetAtt': [
                        REPOSITORY_TASKS_ECS_TASK_DEFINITION_TASK_ROLE_LOGICAL_ID,
                        'Arn',
                      ],
                    },
                  ],
                },
                {
                  Effect: 'Allow',
                  Action: ['ecs:RunTask'],
                  Resource: [
                    {
                      Ref: REPOSITORY_ECS_TASK_DEFINITION_LOGICAL_ID,
                    },
                  ],
                },
                {
                  Action: [
                    'codepipeline:PutJobSuccessResult',
                    'codepipeline:PutJobFailureResult',
                  ],
                  Effect: 'Allow',
                  Resource: '*',
                },
                {
                  Action: 's3:*',
                  Effect: 'Allow',
                  Resource: {
                    'Fn::Sub': [
                      `arn:aws:s3:::\${BucketName}/${TRIGGER_PIPELINES_OBJECT_KEY_PREFIX}*`,
                      {
                        BucketName: {
                          'Fn::ImportValue': BASE_STACK_BUCKET_NAME_EXPORTED_NAME,
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    };

    resources.CicdApiV1ServerlessFunction = {
      Type: 'AWS::Serverless::Function',
      Properties: {
        CodeUri: {
          Bucket: s3.bucket,
          Key: s3.key,
          Version: s3.versionId,
        },
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
            ...executeEcsTaskVariables,
          },
        },
        Handler: 'index.cicdApiV1Handler',
        Role: {
          'Fn::GetAtt': [FUNCTION_IAM_ROLE_LOGICAL_ID, 'Arn'],
        },
        Runtime: 'nodejs14.x',
        Timeout: 60,
      },
    };

    resources.GitHubWebhooksApiV1ServerlessFunction = {
      Type: 'AWS::Serverless::Function',
      Properties: {
        CodeUri: {
          Bucket: s3.bucket,
          Key: s3.key,
          Version: s3.versionId,
        },
        Events: {
          ApiEvent: {
            Type: 'Api',
            Properties: {
              Method: 'POST',
              Path: '/github/webhooks',
              RestApiId: { Ref: API_LOGICAL_ID },
            },
          },
        },
        Environment: {
          Variables: {
            BASE_STACK_BUCKET_NAME: {
              'Fn::ImportValue': BASE_STACK_BUCKET_NAME_EXPORTED_NAME,
            },
            PIPELINES_JSON: JSON.stringify(pipelines),
            ...executeEcsTaskVariables,
          },
        },
        Handler: 'index.githubWebhooksApiV1Handler',
        Role: {
          'Fn::GetAtt': [FUNCTION_IAM_ROLE_LOGICAL_ID, 'Arn'],
        },
        Runtime: 'nodejs14.x',
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
        /**
         * TODO: improve the policies rules.
         */
        Policies: [
          {
            PolicyName: `${REPOSITORY_TASKS_ECS_TASK_DEFINITION_TASK_ROLE_LOGICAL_ID}Policy`,
            PolicyDocument: {
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Action: ['*'],
                  Resource: '*',
                },
              ],
            },
          },
        ],
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
        Cpu: cpu,
        ExecutionRoleArn: {
          'Fn::GetAtt': [
            REPOSITORY_TASKS_ECS_TASK_DEFINITION_EXECUTION_ROLE_LOGICAL_ID,
            'Arn',
          ],
        },
        Memory: memory,
        NetworkMode: 'awsvpc',
        RequiresCompatibilities: ['FARGATE'],
        TaskRoleArn: {
          'Fn::GetAtt': [
            REPOSITORY_TASKS_ECS_TASK_DEFINITION_TASK_ROLE_LOGICAL_ID,
            'Arn',
          ],
        },
      },
    };
  })();

  /**
   * Pipelines
   */
  if (pipelines.includes('main')) {
    resources[PIPELINES_ARTIFACT_STORE_S3_BUCKET_LOGICAL_ID] = {
      Type: 'AWS::S3::Bucket',
      Properties: {
        LifecycleConfiguration: {
          Rules: [
            {
              /**
               * We won't use the artifacts forever.
               */
              ExpirationInDays: 7,
              Status: 'Enabled',
            },
          ],
        },
      },
    };

    resources[PIPELINES_HANDLER_LAMBDA_FUNCTION_LOGICAL_ID] = {
      Type: 'AWS::Lambda::Function',
      Properties: {
        Code: {
          S3Bucket: s3.bucket,
          S3Key: s3.key,
          S3ObjectVersion: s3.versionId,
        },
        Environment: {
          Variables: {
            ...executeEcsTaskVariables,
          },
        },
        Handler: 'index.pipelinesHandler',
        MemorySize: 128,
        Role: {
          'Fn::GetAtt': [FUNCTION_IAM_ROLE_LOGICAL_ID, 'Arn'],
        },
        Runtime: 'nodejs14.x',
        Timeout: 60,
      },
    };

    resources[PIPELINES_MAIN_ROLE_LOGICAL_ID] = {
      Type: 'AWS::IAM::Role',
      Properties: {
        AssumeRolePolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: 'codepipeline.amazonaws.com',
              },
              Action: 'sts:AssumeRole',
            },
          ],
        },
        ManagedPolicyArns: [],
        Path: getIamPath(),
        Policies: [
          {
            PolicyName: `${PIPELINES_MAIN_ROLE_LOGICAL_ID}Policy`,
            PolicyDocument: {
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Action: 'lambda:InvokeFunction',
                  Resource: [
                    {
                      'Fn::GetAtt': [
                        PIPELINES_HANDLER_LAMBDA_FUNCTION_LOGICAL_ID,
                        'Arn',
                      ],
                    },
                  ],
                },
                {
                  Effect: 'Allow',
                  Action: 's3:*',
                  Resource: [
                    {
                      'Fn::GetAtt': [
                        PIPELINES_ARTIFACT_STORE_S3_BUCKET_LOGICAL_ID,
                        'Arn',
                      ],
                    },
                    {
                      'Fn::Sub': `arn:aws:s3:::\${${PIPELINES_ARTIFACT_STORE_S3_BUCKET_LOGICAL_ID}}/*`,
                    },
                  ],
                },
                {
                  Effect: 'Allow',
                  Action: 's3:*',
                  Resource: {
                    'Fn::Sub': [
                      `arn:aws:s3:::\${BucketName}/${TRIGGER_PIPELINES_OBJECT_KEY_PREFIX}*`,
                      {
                        BucketName: {
                          'Fn::ImportValue': BASE_STACK_BUCKET_NAME_EXPORTED_NAME,
                        },
                      },
                    ],
                  },
                },
                {
                  Effect: 'Allow',
                  Action: ['s3:Get*', 's3:List*'],
                  Resource: {
                    'Fn::Sub': [
                      `arn:aws:s3:::\${BucketName}`,
                      {
                        BucketName: {
                          'Fn::ImportValue': BASE_STACK_BUCKET_NAME_EXPORTED_NAME,
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    };

    const pipelineMainS3SourceOutputName = 'PipelineMainS3SourceOutput';

    resources[PIPELINES_MAIN_LOGICAL_ID] = {
      Type: 'AWS::CodePipeline::Pipeline',
      Properties: {
        ArtifactStore: {
          Location: { Ref: PIPELINES_ARTIFACT_STORE_S3_BUCKET_LOGICAL_ID },
          Type: 'S3',
        },
        RestartExecutionOnUpdate: false,
        RoleArn: {
          'Fn::GetAtt': [PIPELINES_MAIN_ROLE_LOGICAL_ID, 'Arn'],
        },
        Stages: [
          {
            Actions: [
              {
                ActionTypeId: {
                  Category: 'Source',
                  Owner: 'AWS',
                  Provider: 'S3',
                  Version: 1,
                },
                Configuration: {
                  S3Bucket: {
                    'Fn::ImportValue': BASE_STACK_BUCKET_NAME_EXPORTED_NAME,
                  },
                  S3ObjectKey: getTriggerPipelinesObjectKey('main'),
                },
                Name: 'PipelineMainS3SourceAction',
                OutputArtifacts: [
                  {
                    Name: pipelineMainS3SourceOutputName,
                  },
                ],
              },
            ],
            Name: 'PipelineMainS3SourceStage',
          },
          {
            Actions: [
              {
                ActionTypeId: {
                  Category: 'Invoke',
                  Owner: 'AWS',
                  Provider: 'Lambda',
                  Version: 1,
                },
                Configuration: {
                  FunctionName: {
                    Ref: PIPELINES_HANDLER_LAMBDA_FUNCTION_LOGICAL_ID,
                  },
                  UserParameters: ((): Pipeline => 'main')(),
                },
                InputArtifacts: [
                  {
                    Name: pipelineMainS3SourceOutputName,
                  },
                ],
                Name: 'PipelineMainRunECSTasksAction',
              },
              {
                ActionTypeId: {
                  Category: 'Approval',
                  Owner: 'AWS',
                  Provider: 'Manual',
                  Version: 1,
                },
                Name: 'PipelineMainRunECSTasksApproval',
              },
            ],
            Name: 'PipelineMainRunECSTasksStage',
          },
        ],
      },
    };
  }

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
      [REPOSITORY_IMAGE_CODE_BUILD_PROJECT_LOGICAL_ID]: {
        Value: { Ref: REPOSITORY_IMAGE_CODE_BUILD_PROJECT_LOGICAL_ID },
      },
      ApiV1Endpoint: {
        Description: 'CICD API v1 stage endpoint.',
        Value: {
          'Fn::Sub': `https://\${${API_LOGICAL_ID}}.execute-api.\${AWS::Region}.amazonaws.com/v1/`,
        },
      },
    },
  };
};

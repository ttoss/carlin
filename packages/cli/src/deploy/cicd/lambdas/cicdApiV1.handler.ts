import { CodeBuild, ECS } from 'aws-sdk';
import { ProxyHandler } from 'aws-lambda';

const codebuild = new CodeBuild({ apiVersion: '2016-10-06' });

const ecs = new ECS({ apiVersion: '2014-11-13' });

const getProcessEnvVariable = (env: string): string => {
  if (process.env[env]) {
    return process.env[env] as string;
  }

  throw new Error(`process.env.${env} doesn't exist.`);
};

export const cicdApiV1Handler: ProxyHandler = async (event) => {
  try {
    const body = JSON.parse(event.body || JSON.stringify({}));

    let response;

    if (body.action === 'updateRepository') {
      response = await codebuild
        .startBuild({
          projectName: getProcessEnvVariable(
            'PROCESS_ENV_REPOSITORY_IMAGE_CODE_BUILD_PROJECT_NAME',
          ),
        })
        .promise();
    }

    if (body.action === 'executeTask') {
      const { commands = [], cpu, memory, environments = [] } = body;

      if (commands.length === 0) {
        throw new Error('Commands were not provided.');
      }

      const command = [
        /**
         * https://stackoverflow.com/questions/2853803/how-to-echo-shell-commands-as-they-are-executed/2853811
         */
        'set -x',
        ...commands,
      ]
        .map((c) => c.replace(/;$/, ''))
        .join(' && ');

      response = await ecs
        .runTask({
          taskDefinition: getProcessEnvVariable('ECS_TASK_DEFINITION'),
          cluster: getProcessEnvVariable('ECS_CLUSTER_ARN'),
          count: 1,
          launchType: 'FARGATE',
          networkConfiguration: {
            awsvpcConfiguration: {
              subnets: [
                getProcessEnvVariable('VPC_PUBLIC_SUBNET_0'),
                getProcessEnvVariable('VPC_PUBLIC_SUBNET_1'),
                getProcessEnvVariable('VPC_PUBLIC_SUBNET_2'),
              ],
              assignPublicIp: 'ENABLED',
              securityGroups: [getProcessEnvVariable('VPC_SECURITY_GROUP')],
            },
          },
          overrides: {
            containerOverrides: [
              {
                command: ['sh', '-cv', command],
                name: getProcessEnvVariable('ECS_CONTAINER_NAME'),
                environment: [
                  ...environments,
                  {
                    name: 'CI',
                    value: 'true',
                  },
                  {
                    name: 'ECS_ENABLE_CONTAINER_METADATA',
                    value: 'true',
                  },
                ],
              },
            ],
            cpu,
            memory,
          },
        })
        .promise();
    }

    if (response) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(response),
      };
    }

    return {
      statusCode: 403,
      body: 'Execute access forbidden',
    };
  } catch (err) {
    return {
      statusCode: 400,
      body: err.message,
    };
  }
};

import { CodeBuild } from 'aws-sdk';
import { ProxyHandler } from 'aws-lambda';

import { executeTasks } from './executeTasks';
import { getProcessEnvVariable } from './getProcessEnvVariable';

const codebuild = new CodeBuild({ apiVersion: '2016-10-06' });

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

      response = await executeTasks({ commands, cpu, memory, environments });
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

import AWS from 'aws-sdk';
import log from 'npmlog';
import { CommandModule } from 'yargs';

import { AWS_DEFAULT_REGION } from '../config';

import { ENVIRONMENTS, Environment } from '../utils/environments';

// import { uploadDirectoryToS3 } from './s3';

import { deployPepeBaseCommand } from './pepeBase/command';

import { deploy } from './deploy';

const logPrefix = 'deploy';

export const deployCommand: CommandModule<
  any,
  {
    destroy: boolean;
    environment?: Environment;
    region: string;
    sandboxAwsAccountId?: string;
    skipAssets: boolean;
    skipEnvironments: Environment[];
    stackName?: string;
    staticApp: boolean;
    staticAppBuildFolder: string;
    staticAppEdge: boolean;
    templatePath: string;
  }
> = {
  command: 'deploy',
  describe: 'Deploy cloud resources',
  builder: (yargs) =>
    yargs
      .command(deployPepeBaseCommand)
      .options({
        destroy: {
          default: false,
          description: 'Destroy the deployment.',
          type: 'boolean',
        },
        environment: {
          alias: 'e',
          choices: ENVIRONMENTS,
          coerce: (environment: Environment) => {
            if (
              environment &&
              process.env.ENVIRONMENT &&
              environment !== process.env.ENVIRONMENT
            ) {
              log.error(
                logPrefix,
                `Option environment (${environment}) is different from process.env.Environment (${process.env.ENVIRONMENT}). Exited.`
              );
              process.exit(1);
            }

            if (environment) {
              process.env.ENVIRONMENT = environment;
            }

            return environment;
          },
          describe: 'Environment',
          require: false,
        },
        parameters: {
          default: [],
          describe:
            'A list of Parameter structures that specify input parameters for the stack.',
          type: 'array',
        },
        region: {
          alias: 'r',
          default: AWS_DEFAULT_REGION,
          describe: 'AWS region',
          type: 'string',
        },
        sandboxAwsAccountId: {
          describe:
            'Sandbox AWS account is the account in which not production resources will be deployed.',
          require: false,
          type: 'string',
        },
        skipAssets: {
          default: false,
          description: 'Skip assets deployment (Lambdas, Lambda Layers...).',
          type: 'boolean',
        },
        skipEnvironments: {
          choices: ENVIRONMENTS,
          default: [],
          describe: 'Choose which environments will be skipped by Pepe.',
          require: false,
          type: 'array',
        },
        stackName: {
          describe: 'CloudFormation Stack name.',
          type: 'string',
        },
        staticApp: {
          default: false,
          description: 'The deployment deploys a static app.',
          type: 'boolean',
        },
        staticAppBuildFolder: {
          default: 'build',
          describe: 'Folder with the built app.',
          type: 'string',
        },
        staticAppEdge: {
          default: false,
          description: 'Add dynamic routing through Lambda@Edge.',
          type: 'boolean',
        },
        templatePath: {
          alias: 't',
          default: 'src/cloudformation.yml',
          type: 'string',
        },
      })
      .middleware(({ region }) => {
        AWS.config.update({ region });
      }),
  handler: deploy,
};

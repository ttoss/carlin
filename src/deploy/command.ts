import AWS from 'aws-sdk';
import log from 'npmlog';
import { CommandModule } from 'yargs';

import { AWS_DEFAULT_REGION } from '../config';

import { getAwsAccountId, getEnvironment } from '../utils';

// import { uploadDirectoryToS3 } from './s3';

import { deployPepeBaseCommand } from './pepeBase/command';
import { deployStaticAppCommand } from './staticApp/command';

import { deploy } from './deploy';
import { setPreDefinedStackName } from './stackName';

const logPrefix = 'deploy';

const checkAwsAccountId = async (awsAccountId: string) => {
  try {
    const currentAwsAccountId = await getAwsAccountId();
    if (String(awsAccountId) !== String(currentAwsAccountId)) {
      throw new Error(
        `AWS account id does not match. Current is "${currentAwsAccountId}" but the defined in configuration files is "${awsAccountId}".`
      );
    }
  } catch (err) {
    log.error(logPrefix, err.message);
    process.exit();
  }
};

export const deployCommand: CommandModule<
  any,
  {
    destroy: boolean;
    // environment?: Environment;
    region: string;
    // sandboxAwsAccountId?: string;
    // skipAssets: boolean;
    // skipEnvironments: Environment[];
    stackName?: string;
    // staticApp: boolean;
    // staticAppBuildFolder: string;
    // staticAppEdge: boolean;
    templatePath: string;
  }
> = {
  command: 'deploy',
  describe: 'Deploy cloud resources',
  builder: (yargs) => {
    yargs
      .options({
        destroy: {
          default: false,
          description: 'Destroy the deployment.',
          type: 'boolean',
        },
        // parameters: {
        //   default: [],
        //   describe:
        //     'A list of Parameter structures that specify input parameters for the stack.',
        //   type: 'array',
        // },
        region: {
          alias: 'r',
          default: AWS_DEFAULT_REGION,
          describe: 'AWS region',
          type: 'string',
        },
        // sandboxAwsAccountId: {
        //   describe:
        //     'Sandbox AWS account is the account in which not production resources will be deployed.',
        //   require: false,
        //   type: 'string',
        // },
        // skipAssets: {
        //   default: false,
        //   description: 'Skip assets deployment (Lambdas, Lambda Layers...).',
        //   type: 'boolean',
        // },
        // skipEnvironments: {
        //   choices: ENVIRONMENTS,
        //   default: [],
        //   describe: 'Choose which environments will be skipped by Pepe.',
        //   require: false,
        //   type: 'array',
        // },
        stackName: {
          describe: 'CloudFormation Stack name.',
          type: 'string',
        },
        templatePath: {
          alias: 't',
          default: 'src/cloudformation.yml',
          type: 'string',
        },
      })
      .middleware(({ region, stackName }) => {
        AWS.config.region = region;
        if (stackName) setPreDefinedStackName(stackName);
      })
      /**
       * Check AWS account id.
       */
      .middleware(
        async ({
          environments,
          environment,
          awsAccountId: defaultAwsAccountId,
        }) => {
          const envAwsAccountId: string | undefined = (() => {
            return environments && environment && environments[environment]
              ? environments[environment].awsAccountId
              : undefined;
          })();
          if (defaultAwsAccountId || envAwsAccountId) {
            await checkAwsAccountId(defaultAwsAccountId || envAwsAccountId);
          }
        }
      )
      .command(deployStaticAppCommand)
      .command(deployPepeBaseCommand);

    return yargs;
  },
  handler: () => {
    console.log(getEnvironment());
  },
};

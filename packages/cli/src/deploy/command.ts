import AWS from 'aws-sdk';
import log from 'npmlog';
import { CommandModule } from 'yargs';

import { AWS_DEFAULT_REGION } from '../config';
import { getAwsAccountId } from '../utils';

import { deployBaseStackCommand } from './baseStack/command';
import {
  deployCloudFormation,
  destroyCloudFormation,
  printStackOutputsAfterDeploy,
} from './cloudFormation';
import { deployLambdaLayer } from './lambdaLayer';
import { deployStaticAppCommand } from './staticApp/command';
import { getStackName, setPreDefinedStackName } from './stackName';

const logPrefix = 'deploy';

const checkAwsAccountId = async (awsAccountId: string) => {
  try {
    const currentAwsAccountId = await getAwsAccountId();
    if (String(awsAccountId) !== String(currentAwsAccountId)) {
      throw new Error(
        `AWS account id does not match. Current is "${currentAwsAccountId}" but the defined in configuration files is "${awsAccountId}".`,
      );
    }
  } catch (err) {
    log.error(logPrefix, err.message);
    process.exit();
  }
};

const describeDeployCommand: CommandModule = {
  command: 'describe',
  describe: 'Print the outputs of the deployment.',
  handler: async ({ stackName }) => {
    try {
      const newStackName = (stackName as string) || (await getStackName());
      await printStackOutputsAfterDeploy({ stackName: newStackName });
    } catch (err) {
      log.info(logPrefix, 'Cannot describe stack. Message: %s', err.message);
    }
  },
};

export const deployCommand: CommandModule<
  any,
  {
    destroy: boolean;
    lambdaInput: string;
    lambdaExternals: string[];
    region: string;
    stackName?: string;
    templatePath: string;
  }
> = {
  command: 'deploy [specific]',
  describe: 'Deploy cloud resources.',
  builder: (yargs) => {
    yargs
      .options({
        'aws-account-id': {
          description: 'AWS account id associated with the deployment.',
          type: 'string',
        },
        destroy: {
          default: false,
          description:
            'Destroy the deployment. You cannot destroy a deploy with "environment" is defined.',
          type: 'boolean',
        },
        'lambda-externals': {
          default: [],
          describe: 'Lambda external packages.',
          type: 'array',
        },
        'lambda-input': {
          default: 'src/lambda.ts',
          describe:
            'Lambda input file. This file export all handlers used by the Lambda Functions.',
          type: 'string',
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
        'stack-name': {
          describe: 'CloudFormation Stack name.',
          type: 'string',
        },
        'template-path': {
          alias: 't',
          type: 'string',
        },
        'termination-protection': {
          describe: [
            'You can prevent a stack from being accidentally deleted by enabling termination protection.',
            'Note that you cannot disable termination protection (passing false to this option) once it is already activated.',
          ].join(' '),
          type: 'boolean',
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
        },
      )
      .command({
        command: 'lambda-layer',
        describe: 'Deploy Lambda Layer.',
        handler: deployLambdaLayer,
      })
      .command(describeDeployCommand)
      .command(deployBaseStackCommand)
      .command(deployStaticAppCommand);

    return yargs;
  },
  handler: ({ destroy, ...rest }) => {
    if (destroy) {
      destroyCloudFormation();
    } else {
      deployCloudFormation(rest);
    }
  },
};

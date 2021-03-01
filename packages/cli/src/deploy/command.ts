import AWS from 'aws-sdk';
import log from 'npmlog';
import yargs, { CommandModule } from 'yargs';

import { AWS_DEFAULT_REGION } from '../config';
import { addGroupToOptions, getAwsAccountId } from '../utils';

import { deployBaseStackCommand } from './baseStack/command';
import { deployCloudFormation, destroyCloudFormation } from './cloudFormation';
import { printStackOutputsAfterDeploy } from './cloudFormation.core';
import { deployLambdaLayerCommand } from './lambdaLayer/command';
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

export const options = {
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
  /**
   * This option has the format:
   *
   * ```ts
   * Array<{
   *  ParameterKey: string,
   *  ParameterValue: string,
   *  UsePreviousValue: true | false,
   *  ResolvedValue: string
   * }>
   * ```
   */
  parameters: {
    alias: 'p',
    default: [],
    describe:
      'A list of parameters that will be passed to CloudFormation Parameters when deploying. The format is the same as parameters from cloudformation create-stack CLI command.',
    type: 'array',
  },
  region: {
    alias: 'r',
    default: AWS_DEFAULT_REGION,
    describe: 'AWS region.',
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
} as const;

export const examples: ReadonlyArray<[string, string?]> = [
  [
    'carlin deploy -t src/cloudformation.template1.yml',
    'Change the CloudFormation template path.',
  ],
  ['carlin deploy -e Production', 'Set environment.'],
  [
    'carlin deploy --lambda-input src/lambda/index.ts --lambda-externals momentjs',
    "Lambda exists. Don't bundle momentjs.",
  ],
  [
    'carlin deploy --destroy --stack-name StackToBeDeleted',
    'Destroy a specific stack.',
  ],
];

export const deployCommand: CommandModule<
  any,
  yargs.InferredOptionTypes<typeof options>
> = {
  command: 'deploy [deploy]',
  describe: 'Deploy cloud resources.',
  builder: (yargsBuilder) => {
    yargsBuilder
      .example(examples)
      .options(addGroupToOptions(options, 'Deploy Options'))
      /**
       * Set AWS region.
       */
      .middleware(({ region }) => {
        AWS.config.region = region;
      })
      /**
       * Set stack name,
       */
      .middleware(({ stackName }) => {
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
      .command(deployLambdaLayerCommand)
      .command(describeDeployCommand)
      .command(deployBaseStackCommand)
      .command(deployStaticAppCommand);

    return yargsBuilder;
  },
  handler: ({ destroy, ...rest }) => {
    if (destroy) {
      destroyCloudFormation();
    } else {
      deployCloudFormation(rest as any);
    }
  },
};

import {
  CloudFormationClient,
  CreateStackCommand,
  DescribeStackEventsCommand,
  DescribeStackResourceCommand,
  DescribeStackResourceCommandInput,
  DescribeStacksCommand,
  DeleteStackCommand,
  ListStackResourcesCommand,
  UpdateStackCommand,
  UpdateTerminationProtectionCommand,
} from '@aws-sdk/client-cloudformation';
import AWS from 'aws-sdk';
import log from 'npmlog';

import { CloudFormationTemplate, getEnvironment, getEnvVar } from '../utils';

import { addDefaults } from './addDefaults.cloudFormation';
import { emptyS3Directory } from './s3';

const logPrefix = 'cloudformation';
log.addLevel('event', 10000, { fg: 'yellow' });
log.addLevel('output', 10000, { fg: 'blue' });

/**
 * https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cloudformation-limits.html
 */
const TEMPLATE_BODY_MAX_SIZE = 51200;

const isTemplateBodyGreaterThanMaxSize = (
  template: CloudFormationTemplate,
): boolean =>
  Buffer.byteLength(JSON.stringify(template), 'utf8') >= TEMPLATE_BODY_MAX_SIZE;

/**
 * Update CloudFormation template to base stack bucket.
 * @param input.stackName: CloudFormation stack name.
 * @param input.template: CloudFormation template.
 */
const uploadTemplateToBaseStackBucket = async ({
  stackName,
  template,
}: {
  stackName: string;
  template: CloudFormationTemplate;
}) => {
  console.info({ stackName, template });
  console.log('uploadTemplateToBaseStackBucket needs to be implemented.');
  throw new Error();
  // const key = getPepeBucketTemplateKey({ stackName });
  // return uploadFileToS3({
  //   bucket: await getPepeBucketName(),
  //   contentType: 'application/json',
  //   file: Buffer.from(JSON.stringify(template, null, 2)),
  //   key,
  // });
};

export const cloudFormation = () => {
  return new CloudFormationClient({
    apiVersion: '2010-05-15',
    region: getEnvVar('REGION'),
  });
};

export const cloudFormationV2 = () => {
  return new AWS.CloudFormation({ apiVersion: '2010-05-15' });
};

export const describeStacks = async ({
  stackName,
}: { stackName?: string } = {}) => {
  const { Stacks } = await cloudFormation().send(
    new DescribeStacksCommand({ StackName: stackName }),
  );
  return Stacks;
};

export const describeStackResource = async (
  input: DescribeStackResourceCommandInput,
) => {
  return cloudFormation().send(new DescribeStackResourceCommand(input));
};

export const doesStackExist = async ({ stackName }: { stackName: string }) => {
  log.info(logPrefix, `Checking if stack ${stackName} already exists...`);

  try {
    await describeStacks({ stackName });
    log.info(logPrefix, `Stack ${stackName} already exists.`);
    return true;
  } catch (err) {
    if (err.code === 'ValidationError') {
      log.info(logPrefix, `Stack ${stackName} does not exist.`);
      return false;
    }
    throw err;
  }
};

export const describeStackEvents = async ({
  stackName,
}: {
  stackName: string;
}) => {
  log.error(logPrefix, 'Stack events:');

  const { StackEvents } = await cloudFormation().send(
    new DescribeStackEventsCommand({ StackName: stackName }),
  );

  const events = (StackEvents || [])
    .filter(({ Timestamp }) => Date.now() - Number(Timestamp) < 10 * 60 * 1000)
    .filter(({ ResourceStatusReason }) => ResourceStatusReason)
    /**
     * Show newer events last.
     */
    .reverse();

  events.forEach(({ LogicalResourceId, ResourceStatusReason }) =>
    log.event(LogicalResourceId, ResourceStatusReason),
  );

  return events;
};

export const describeStack = async ({ stackName }: { stackName: string }) => {
  const stacks = await describeStacks({ stackName });

  if (!stacks) {
    throw new Error(`Stack ${stackName} not found and cannot be described.`);
  }

  return stacks[0];
};

export const getStackOutput = async ({
  stackName,
  outputKey,
}: {
  stackName: string;
  outputKey: string;
}) => {
  const { Outputs = [] } = await describeStack({ stackName });

  const output = Outputs?.find(({ OutputKey }) => OutputKey === outputKey);

  if (!output) {
    throw new Error(`Output ${outputKey} doesn't exist on ${stackName} stack`);
  }

  return output;
};

export const printStackOutputsAfterDeploy = async ({
  stackName,
}: {
  stackName: string;
}) => {
  const {
    EnableTerminationProtection,
    StackName,
    Outputs,
  } = await describeStack({ stackName });

  log.output('Describe Stack');
  log.output('StackName', StackName);
  log.output('EnableTerminationProtection', EnableTerminationProtection);
  (Outputs || []).forEach(
    ({ OutputKey, OutputValue, Description, ExportName }) => {
      log.output(
        `${OutputKey}`,
        [
          '',
          `OutputKey: ${OutputKey}`,
          `OutputValue: ${OutputValue}`,
          `Description: ${Description}`,
          `ExportName: ${ExportName}`,
          '',
        ].join('\n'),
      );
    },
  );
};

export const deleteStack = async ({ stackName }: { stackName: string }) => {
  log.info(logPrefix, `Deleting stack ${stackName}...`);
  await cloudFormation().send(new DeleteStackCommand({ StackName: stackName }));
  try {
    await cloudFormationV2()
      .waitFor('stackDeleteComplete', { StackName: stackName })
      .promise();
  } catch (err) {
    log.error(logPrefix, `An error occurred when deleting stack ${stackName}.`);
    await describeStackEvents({ stackName });
    throw err;
  }
  log.info(logPrefix, `Stack ${stackName} deleted.`);
};

export const createStack = async ({
  params,
}: {
  params: AWS.CloudFormation.CreateStackInput;
}) => {
  const { StackName: stackName } = params;
  log.info(logPrefix, `Creating stack ${stackName}...`);
  await cloudFormation().send(new CreateStackCommand(params));
  try {
    await cloudFormationV2()
      .waitFor('stackCreateComplete', { StackName: stackName })
      .promise();
  } catch (err) {
    log.error(logPrefix, `An error occurred when creating stack ${stackName}.`);
    await describeStackEvents({ stackName });
    await deleteStack({ stackName });
    throw err;
  }
  log.info(logPrefix, `Stack ${stackName} was created.`);
};

export const updateStack = async ({
  params,
}: {
  params: AWS.CloudFormation.UpdateStackInput;
}) => {
  const { StackName: stackName } = params;
  log.info(logPrefix, `Updating stack ${stackName}...`);
  try {
    await cloudFormation().send(new UpdateStackCommand(params));
    await cloudFormationV2()
      .waitFor('stackUpdateComplete', { StackName: stackName })
      .promise();
  } catch (err) {
    if (err.message === 'No updates are to be performed.') {
      log.info(logPrefix, err.message);
      return;
    }
    log.error(logPrefix, 'An error occurred when updating stack.');
    await describeStackEvents({ stackName });
    throw err;
  }
  log.info(logPrefix, `Stack ${stackName} was updated.`);
};

export const enableTerminationProtection = async ({
  stackName,
}: {
  stackName: string;
}) => {
  log.info(logPrefix, `Enabling termination protection...`);

  try {
    await cloudFormation().send(
      new UpdateTerminationProtectionCommand({
        EnableTerminationProtection: true,
        StackName: stackName,
      }),
    );
  } catch (err) {
    log.error(
      logPrefix,
      'An error occurred when enabling termination protection',
    );
    throw err;
  }
};

export const defaultTemplatePaths = ['ts', 'js', 'yaml', 'yml', 'json'].map(
  (extension) => `src/cloudformation.${extension}`,
);

/**
 * 1. Add defaults to CloudFormation template and parameters.
 * 1. Check is CloudFormation template body is greater than max size limit.
 *  1. If is greater, upload to S3 base stack.
 * 1. If stack exists, update the stack, else create a new stack.
 * 1. If `terminationProtection` option is true or `environment` is defined,
 * then stack termination protection will be enabled.
 */
export const deploy = async ({
  terminationProtection = false,
  ...paramsAndTemplate
}: {
  terminationProtection?: boolean;
  params:
    | AWS.CloudFormation.CreateStackInput
    | AWS.CloudFormation.UpdateStackInput;
  template: CloudFormationTemplate;
}) => {
  const { params, template } = await addDefaults(paramsAndTemplate);

  const stackName = params.StackName;

  delete params.TemplateBody;
  delete params.TemplateURL;

  if (isTemplateBodyGreaterThanMaxSize(template)) {
    const { url } = await uploadTemplateToBaseStackBucket({
      stackName,
      template,
    });

    params.TemplateURL = url;
  } else {
    params.TemplateBody = JSON.stringify(template);
  }

  /**
   * CAPABILITY_AUTO_EXPAND allows serverless transform.
   */
  params.Capabilities = [
    'CAPABILITY_AUTO_EXPAND',
    'CAPABILITY_IAM',
    'CAPABILITY_NAMED_IAM',
  ];

  if (await doesStackExist({ stackName })) {
    await updateStack({ params });
  } else {
    await createStack({ params });
  }

  if (terminationProtection || !!getEnvironment()) {
    await enableTerminationProtection({ stackName });
  }

  await printStackOutputsAfterDeploy({ stackName });

  return describeStack({ stackName });
};

export const canDestroyStack = async ({ stackName }: { stackName: string }) => {
  const { EnableTerminationProtection } = await describeStack({ stackName });

  if (EnableTerminationProtection) {
    return false;
  }

  return true;
};

const emptyStackBuckets = async ({ stackName }: { stackName: string }) => {
  const buckets: string[] = [];

  await (async function getBuckets({ nextToken }: { nextToken?: string }) {
    const { NextToken, StackResourceSummaries } = await cloudFormation().send(
      new ListStackResourcesCommand({
        StackName: stackName,
        NextToken: nextToken,
      }),
    );

    if (NextToken) {
      await getBuckets({ nextToken: NextToken });
    }

    (StackResourceSummaries || []).forEach(
      ({ ResourceType, PhysicalResourceId }) => {
        if (ResourceType === 'AWS::S3::Bucket' && PhysicalResourceId) {
          buckets.push(PhysicalResourceId);
        }
      },
    );
  })({});

  return Promise.all(buckets.map((bucket) => emptyS3Directory({ bucket })));
};

/**
 * 1. Check if `environment` is defined. If defined, return. It doesn't destroy
 * stacks with defined `environment`.
 * 1. Check if termination protection is disabled.
 * 1. If the stack deployed buckets, empty all buckets.
 * 1. Delete the stack.
 */
export const destroy = async ({ stackName }: { stackName: string }) => {
  const environment = getEnvironment();

  if (environment) {
    log.info(
      logPrefix,
      `Cannot destroy stack when environment (${environment}) is defined.`,
    );
    return;
  }

  if (!(await doesStackExist({ stackName }))) {
    log.info(logPrefix, `Stack ${stackName} doesn't exist.`);
    return;
  }

  if (!(await canDestroyStack({ stackName }))) {
    const message = `Stack ${stackName} cannot be destroyed while TerminationProtection is enabled.`;
    throw new Error(message);
  }

  await emptyStackBuckets({ stackName });

  await deleteStack({ stackName });
};

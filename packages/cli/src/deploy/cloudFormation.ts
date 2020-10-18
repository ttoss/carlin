import AWS from 'aws-sdk';
import fs from 'fs';
import log from 'npmlog';
import path from 'path';

import {
  CloudFormationTemplate,
  getEnvironment,
  readCloudFormationYamlTemplate,
  readObjectFile,
} from '../utils';

import { addDefaults } from './addDefaults.cloudFormation';
import { deployLambdaCode } from './lambda';
import { emptyS3Directory } from './s3';
import { getStackName } from './stackName';

const logPrefix = 'cloudformation';
log.addLevel('event', 10000, { fg: 'yellow' });
log.addLevel('output', 10000, { fg: 'blue' });

// https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cloudformation-limits.html
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

export const cloudFormation = () =>
  new AWS.CloudFormation({ apiVersion: '2010-05-15' });

export const doesStackExist = async ({ stackName }: { stackName: string }) => {
  log.info(logPrefix, `Checking if stack already exists...`);

  try {
    await cloudFormation().describeStacks({ StackName: stackName }).promise();
    log.info(logPrefix, 'Stack already exists');
    return true;
  } catch (err) {
    if (err.code === 'ValidationError') {
      log.info(logPrefix, 'Stack does not exist');
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

  const { StackEvents } = await cloudFormation()
    .describeStackEvents({ StackName: stackName })
    .promise();

  const events = (StackEvents || [])
    .filter(({ Timestamp }) => Date.now() - Number(Timestamp) < 10 * 60 * 1000)
    .filter(({ ResourceStatusReason }) => ResourceStatusReason);

  events.forEach(({ LogicalResourceId, ResourceStatusReason }) =>
    log.event(LogicalResourceId, ResourceStatusReason),
  );

  return events;
};

export const describeStacks = async ({ stackName }: { stackName: string }) => {
  const { Stacks } = await cloudFormation()
    .describeStacks({ StackName: stackName })
    .promise();

  return Stacks;
};

export const describeStack = async ({ stackName }: { stackName: string }) => {
  const { Stacks } = await cloudFormation()
    .describeStacks({ StackName: stackName })
    .promise();

  if (!Stacks) {
    throw new Error(`Stack ${stackName} not found and cannot be described`);
  }

  return Stacks[0];
};

export const printStackOutputsAfterDeploy = async ({
  stackName,
}: {
  stackName: string;
}) => {
  const Stacks = await describeStacks({ stackName });

  if (!Stacks) {
    return;
  }

  const { EnableTerminationProtection, StackName, Outputs } = Stacks[0];

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
  log.info(logPrefix, 'Deleting stack...');
  await cloudFormation().deleteStack({ StackName: stackName }).promise();
  try {
    await cloudFormation()
      .waitFor('stackDeleteComplete', { StackName: stackName })
      .promise();
  } catch (err) {
    log.error(logPrefix, 'An error occurred when deleting stack');
    await describeStackEvents({ stackName });
    throw err;
  }
  log.info(logPrefix, 'Stack deleted');
};

export const createStack = async ({
  params,
}: {
  params: AWS.CloudFormation.CreateStackInput;
}) => {
  const { StackName: stackName } = params;
  log.info(logPrefix, `Creating stack...`);
  await cloudFormation().createStack(params).promise();
  try {
    await cloudFormation()
      .waitFor('stackCreateComplete', { StackName: stackName })
      .promise();
  } catch (err) {
    log.error(logPrefix, 'An error occurred when creating stack');
    await describeStackEvents({ stackName });
    await deleteStack({ stackName });
    throw err;
  }
  log.info(logPrefix, `Stack created`);
};

export const updateStack = async ({
  params,
}: {
  params: AWS.CloudFormation.UpdateStackInput;
}) => {
  const { StackName: stackName } = params;
  log.info(logPrefix, `Updating stack...`);
  try {
    await cloudFormation().updateStack(params).promise();
    await cloudFormation()
      .waitFor('stackUpdateComplete', { StackName: stackName })
      .promise();
  } catch (err) {
    if (err.message === 'No updates are to be performed.') {
      log.info(logPrefix, err.message);
      return;
    }
    log.error(logPrefix, 'An error occurred when updating stack');
    await describeStackEvents({ stackName });
    throw err;
  }
  log.info(logPrefix, `Stack updated`);
};

export const enableTerminationProtection = async ({
  stackName,
}: {
  stackName: string;
}) => {
  log.info(logPrefix, `Enabling termination protection...`);

  try {
    await cloudFormation()
      .updateTerminationProtection({
        EnableTerminationProtection: true,
        StackName: stackName,
      })
      .promise();
  } catch (err) {
    log.error(
      logPrefix,
      'An error occurred when enabling termination protection',
    );
    throw err;
  }
};

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

  if (terminationProtection) {
    await enableTerminationProtection({ stackName });
  }

  await printStackOutputsAfterDeploy({ stackName });

  return describeStack({ stackName });
};

const findAndReadCloudFormationTemplate = ({
  templatePath: defaultTemplatePath,
}: {
  templatePath?: string;
}): CloudFormationTemplate => {
  const templatePath =
    defaultTemplatePath ||
    ['ts', 'js', 'yaml', 'yml', 'json']
      .map((extension) => `src/cloudformation.${extension}`)
      /**
       * Iterate over extensions. If the template of the current extension is
       * found, we save it on the accumulator and return it every time until
       * the loop ends.
       */
      .reduce((acc, cur) => {
        if (acc) {
          return acc;
        }
        return fs.existsSync(path.resolve(process.cwd(), cur)) ? cur : acc;
      }, '');

  if (!templatePath) {
    throw new Error('Cannot find a CloudFormation template.');
  }

  const extension = templatePath?.split('.').pop() as string;

  const fullPath = path.resolve(process.cwd(), templatePath);

  /**
   * We need to read Yaml first because CloudFormation specific tags aren't
   * recognized when parsing a simple Yaml file. I.e., a possible error:
   * "Error message: "unknown tag !<!Ref> at line 21, column 34:\n"
   */
  if (['yaml', 'yml'].includes(extension)) {
    return readCloudFormationYamlTemplate({ templatePath });
  }

  return readObjectFile({ path: fullPath });
};

export const deployCloudFormation = async ({
  lambdaInput,
  lambdaExternals,
  parameters,
  template,
  templatePath,
}: {
  lambdaInput: string;
  lambdaExternals: string[];
  parameters?: Array<{ key: string; value: string }>;
  templatePath?: string;
  template?: CloudFormationTemplate;
}) => {
  try {
    log.info(logPrefix, 'Starting CloudFormation deploy...');

    const stackName = await getStackName();

    log.info(logPrefix, `StackName: ${stackName}`);

    const cloudFormationTemplate: CloudFormationTemplate = (() => {
      if (template) {
        return template;
      }

      return findAndReadCloudFormationTemplate({ templatePath });
    })();

    console.log(cloudFormationTemplate);

    process.exit(1);

    await cloudFormation()
      .validateTemplate({
        TemplateBody: JSON.stringify(cloudFormationTemplate),
      })
      .promise();

    const params = {
      StackName: stackName,
      Parameters: (parameters || []).map(({ key, value }) => ({
        ParameterKey: key,
        ParameterValue: value,
      })),
    };

    /**
     * Add S3Bucket and S3Key if Lambda file exists.
     */
    await (async () => {
      const response = await deployLambdaCode({
        lambdaExternals,
        lambdaInput,
        stackName,
      });
      if (response) {
        const { bucket, key, versionId } = response;
        /**
         * Add Parameters to CloudFormation template.
         */
        cloudFormationTemplate.Parameters = {
          LambdaS3Bucket: { Type: 'String' },
          LambdaS3Key: { Type: 'String' },
          LambdaS3Version: { Type: 'String' },
          LambdaS3ObjectVersion: { Type: 'String' },
          ...cloudFormationTemplate.Parameters,
        };
        /**
         * Add S3Bucket and S3Key to params.
         */
        params.Parameters.push(
          {
            ParameterKey: 'LambdaS3Bucket',
            ParameterValue: bucket,
          },
          {
            ParameterKey: 'LambdaS3Key',
            ParameterValue: key,
          },
          /**
           * Used by CloudFormation AWS::Lambda::Function
           * @see {@link https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-lambda-function-code.html}
           */
          {
            ParameterKey: 'LambdaS3ObjectVersion',
            ParameterValue: versionId,
          },
          /**
           * Used by CloudFormation AWS::Serverless::Function
           * @see {@link https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-property-function-functioncode.html}
           */
          {
            ParameterKey: 'LambdaS3Version',
            ParameterValue: versionId,
          },
        );
      }
    })();

    const output = await deploy({ params, template: cloudFormationTemplate });

    return output;
  } catch (err) {
    log.error(
      logPrefix,
      'Cannot deploy CloudFormation. Error message: %j',
      err.message,
    );
    return process.exit();
  }
};

export const canDestroyStack = async ({ stackName }: { stackName: string }) => {
  const stacks = await describeStacks({ stackName });

  if (!stacks) {
    log.info(logPrefix, 'Stack not found and cannot be destroyed.');
    return false;
  }

  const { EnableTerminationProtection } = stacks[0];

  if (EnableTerminationProtection) {
    return false;
  }

  return true;
};

const emptyStackBuckets = async ({ stackName }: { stackName: string }) => {
  const buckets: string[] = [];

  await (async function getBuckets({ nextToken }: { nextToken?: string }) {
    const {
      NextToken,
      StackResourceSummaries,
    } = await cloudFormation()
      .listStackResources({ StackName: stackName, NextToken: nextToken })
      .promise();

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

const destroy = async ({ stackName }: { stackName: string }) => {
  const environment = getEnvironment();

  if (environment) {
    log.info(
      logPrefix,
      `Cannot destroy stack when environment (${environment}) is defined.`,
    );
    return;
  }

  if (!(await doesStackExist({ stackName }))) {
    return;
  }

  if (!(await canDestroyStack({ stackName }))) {
    log.info(
      logPrefix,
      `Stack ${stackName} cannot be destroyed while TerminationProtection is enabled.`,
    );
    return;
  }

  await emptyStackBuckets({ stackName });

  await deleteStack({ stackName });
};

export const destroyCloudFormation = async () => {
  try {
    log.info(logPrefix, 'Starting CloudFormation DESTROY...');

    const stackName = await getStackName();

    log.info(logPrefix, `stackName: ${stackName}`);

    await Promise.all([destroy({ stackName })]);
  } catch (err) {
    log.error(logPrefix, 'Cannot destroy cloudformation stack.');
    log.error(logPrefix, 'Error message: %j', err.message);
    process.exit();
  }
};

import AWS from 'aws-sdk';
import log from 'npmlog';

import {
  CloudFormationTemplate,
  getCurrentBranch,
  getEnvironment,
  getPackageName,
  getPackageVersion,
  getProjectName,
  readCloudFormationTemplate,
} from '../utils';

import { emptyS3Directory } from './s3';
import { getAssetStackName, getStackName } from './stackName';

const logPrefix = 'cloudformation';
log.addLevel('event', 10000, { fg: 'yellow' });
log.addLevel('output', 10000, { fg: 'blue' });

type CloudFormationParams =
  | AWS.CloudFormation.CreateStackInput
  | AWS.CloudFormation.UpdateStackInput;

export const addDefaultsParametersAndTagsToParams = async (
  params: CloudFormationParams
): Promise<CloudFormationParams> => {
  const [
    branchName,
    environment,
    packageName,
    packageVersion,
    projectName,
  ] = await Promise.all([
    getCurrentBranch(),
    getEnvironment(),
    getPackageName(),
    getPackageVersion(),
    getProjectName(),
  ]);

  return {
    ...params,
    Parameters: [
      ...(params.Parameters || []),
      { ParameterKey: 'Environment', ParameterValue: environment },
      { ParameterKey: 'Project', ParameterValue: projectName },
    ],
    Tags: [
      ...(params.Tags || []),
      { Key: 'Branch', Value: branchName },
      { Key: 'Environment', Value: environment },
      { Key: 'Package', Value: packageName },
      { Key: 'Project', Value: projectName },
      { Key: 'Version', Value: packageVersion },
    ],
  };
};

const addDefaultParametersToTemplate = async (
  template: CloudFormationTemplate
): Promise<CloudFormationTemplate> => {
  const [environment, projectName] = await Promise.all([
    getEnvironment(),
    getProjectName(),
  ]);

  const newTemplate = {
    ...template,
    Parameters: {
      Environment: { Default: environment, Type: 'String' },
      Project: { Default: projectName, Type: 'String' },
      ...template.Parameters,
    },
  };

  return newTemplate;
};

const addLogGroupToResources = (
  template: CloudFormationTemplate
): CloudFormationTemplate => {
  const retentionInDays = 30;
  const { Resources } = template;

  const resourcesEntries = Object.entries(Resources);

  resourcesEntries.forEach(([key, resource]) => {
    if (resource.Type === 'AWS::Lambda::Function') {
      const logGroup = resourcesEntries.find(([, resource2]) => {
        const logGroupNameStr = JSON.stringify(
          resource2.Properties?.LogGroupName?.['Fn::Join'] || ''
        );
        return logGroupNameStr.includes(key);
      });

      if (!logGroup) {
        log.info(logPrefix, `Adding log group to Lambda resource: ${key}.`);

        Resources[`${key}LogsLogGroup`] = {
          Type: 'AWS::Logs::LogGroup',
          DeletionPolicy: 'Delete',
          Properties: {
            LogGroupName: { 'Fn::Join': ['/', ['/aws/lambda', { Ref: key }]] },
            RetentionInDays: retentionInDays,
          },
        };
      }
    }
  });

  return template;
};

const addEnvironmentsToLambdaResources = (
  template: CloudFormationTemplate
): CloudFormationTemplate => {
  const environment = getEnvironment();

  const { Resources } = template;

  const resourcesEntries = Object.entries(Resources);

  resourcesEntries.forEach(([, resource]) => {
    if (resource.Type === 'AWS::Lambda::Function') {
      const { Properties } = resource;
      if (!Properties.Environment) {
        Properties.Environment = {};
      }
      if (!Properties.Environment.Variables) {
        Properties.Environment.Variables = {};
      }
      Properties.Environment.Variables.ENVIRONMENT = environment;
    }
  });

  return template;
};

// https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cloudformation-limits.html
const TEMPLATE_BODY_MAX_SIZE = 51200;

const isTemplateBodyGreaterThanMaxSize = (
  template: CloudFormationTemplate
): boolean =>
  Buffer.byteLength(JSON.stringify(template), 'utf8') >= TEMPLATE_BODY_MAX_SIZE;

/**
 * Update CloudFormation template to Pepe
 * @param input.stackName: CloudFormation stack name
 * @param input.template: CloudFormation template
 */
const uploadTemplateToPepeBucket = async ({
  stackName,
  template,
}: {
  stackName: string;
  template: CloudFormationTemplate;
}) => {
  console.log({ stackName, template });
  console.log('uploadTemplateToPepeBucket needs to be implemented.');
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
    log.event(LogicalResourceId, ResourceStatusReason)
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
        ].join('\n')
      );
    }
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
      'An error occurred when enabling termination protection'
    );
    throw err;
  }
};

export const deploy = async ({
  params,
  template,
}: {
  params:
    | AWS.CloudFormation.CreateChangeSetInput
    | AWS.CloudFormation.UpdateStackInput;
  template: CloudFormationTemplate;
}) => {
  const environment = await getEnvironment();

  const stackName = params.StackName;

  let newTemplate = template;
  newTemplate = await addDefaultParametersToTemplate(newTemplate);
  newTemplate = addLogGroupToResources(newTemplate);
  newTemplate = addEnvironmentsToLambdaResources(newTemplate);

  const newParams = await addDefaultsParametersAndTagsToParams(params);

  delete newParams.TemplateBody;
  delete newParams.TemplateURL;

  if (isTemplateBodyGreaterThanMaxSize(newTemplate)) {
    const { url } = await uploadTemplateToPepeBucket({
      stackName,
      template: newTemplate,
    });

    newParams.TemplateURL = url;
  } else {
    newParams.TemplateBody = JSON.stringify(newTemplate);
  }

  /**
   * CAPABILITY_AUTO_EXPAND allows serverless transform.
   */
  newParams.Capabilities = [
    'CAPABILITY_AUTO_EXPAND',
    'CAPABILITY_IAM',
    'CAPABILITY_NAMED_IAM',
  ];

  if (await doesStackExist({ stackName })) {
    await updateStack({ params: newParams });
  } else {
    await createStack({ params: newParams });
  }

  if (environment !== 'Testing') {
    await enableTerminationProtection({ stackName });
  }

  await printStackOutputsAfterDeploy({ stackName });

  return describeStack({ stackName });
};

type AssetsInput = {
  contentType?: string;
  key: string;
  noncurrentVersionExpirationInDays?: number;
  file: Buffer;
};

export const deployCloudFormation = async ({
  // assets,
  // skipAssets,
  // parameters,
  stackName: preDefinedStackName,
  template,
  templatePath,
}: {
  assets?: AssetsInput;
  skipAssets?: boolean;
  parameters?: Array<{ key: string; value: string }>;
  stackName?: string;
  templatePath?: string;
  template?: CloudFormationTemplate;
}) => {
  log.info(logPrefix, 'Starting CloudFormation deploy...');

  const stackName = await getStackName({ preDefinedStackName });

  log.info(logPrefix, `StackName: ${stackName}`);

  const cloudFormationTemplate = (() => {
    if (template) {
      return template;
    }

    if (templatePath) {
      return readCloudFormationTemplate({ templatePath });
    }

    throw new Error('"template" or "templatePath" must be defined');
  })();

  console.log(cloudFormationTemplate);

  // await cloudFormation()
  //   .validateTemplate({ TemplateBody: JSON.stringify(cloudFormationTemplate) })
  //   .promise();

  // const params = {
  //   StackName: stackName,
  //   Parameters: (parameters || []).map(({ key, value }) => ({
  //     ParameterKey: key,
  //     ParameterValue: value,
  //   })),
  // };

  // if (assets) {
  //   if (skipAssets) {
  //     log.info(logPrefix, 'Skipping Lambda deployment...');
  //     const { Parameters } = await describeStack({ stackName });
  //     (Parameters || []).forEach(({ ParameterKey, ParameterValue }) => {
  //       if (
  //         ParameterKey &&
  //         ParameterValue &&
  //         ['AssetsS3Bucket', 'AssetsS3Key', 'AssetsS3ObjectVersion'].includes(
  //           ParameterKey
  //         )
  //       ) {
  //         params.Parameters.push({ ParameterKey, ParameterValue });
  //       }
  //     });
  //   } else {
  //     const { bucket, key, versionId } = await deployAssetsCloudFormation({
  //       assets,
  //       stackName,
  //     });
  //     params.Parameters.push(
  //       {
  //         ParameterKey: 'AssetsS3Bucket',
  //         ParameterValue: bucket,
  //       },
  //       {
  //         ParameterKey: 'AssetsS3Key',
  //         ParameterValue: key,
  //       },
  //       {
  //         ParameterKey: 'AssetsS3ObjectVersion',
  //         ParameterValue: versionId,
  //       }
  //     );
  //   }
  // }

  // return deploy({ params, template: cloudFormationTemplate });
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
      }
    );
  })({});

  return Promise.all(buckets.map((bucket) => emptyS3Directory({ bucket })));
};

const destroy = async ({ stackName }: { stackName: string }) => {
  const environment = await getEnvironment();

  if (environment !== 'Testing') {
    log.info(
      logPrefix,
      `Cannot destroy stack whose environment (${environment}) is not Testing`
    );
    return;
  }

  if (!(await doesStackExist({ stackName }))) {
    return;
  }

  if (!(await canDestroyStack({ stackName }))) {
    log.info(
      logPrefix,
      `Stack ${stackName} cannot be destroyed while TerminationProtection is enabled.`
    );
    return;
  }

  await emptyStackBuckets({ stackName });

  await deleteStack({ stackName });
};

export const destroyCloudFormation = async ({
  stackName: preDefinedStackName,
}: {
  stackName?: string;
}) => {
  log.info(logPrefix, 'Starting CloudFormation DESTROY...');

  const stackName = await (async () => {
    if (preDefinedStackName) {
      return preDefinedStackName;
    }

    return getStackName({ preDefinedStackName });
  })();

  log.info(logPrefix, `preDefinedStackName: ${preDefinedStackName}`);
  log.info(logPrefix, `stackName: ${stackName}`);

  const assetsStackName = getAssetStackName(stackName);

  return Promise.all([
    destroy({ stackName }),
    destroy({ stackName: assetsStackName }),
  ]);
};

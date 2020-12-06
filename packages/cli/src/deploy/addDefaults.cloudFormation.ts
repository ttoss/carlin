import { CloudFormation } from 'aws-sdk';
import log from 'npmlog';

import {
  CloudFormationTemplate,
  getCurrentBranch,
  getEnvironment,
  getPackageName,
  getPackageVersion,
  getProjectName,
} from '../utils';

const logPrefix = 'addDefaultsCloudFormation';

type CloudFormationParams =
  | CloudFormation.CreateStackInput
  | CloudFormation.UpdateStackInput;

type Args = {
  params: CloudFormationParams;
  template: CloudFormationTemplate;
};

const addDefaultsParametersAndTagsToParams = async (
  params: CloudFormationParams,
): Promise<CloudFormationParams> => {
  const [
    branchName,
    environment = 'NoEnv',
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
    ].filter(({ Value }) => !!Value),
  };
};

const addDefaultParametersToTemplate = async (
  template: CloudFormationTemplate,
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
  template: CloudFormationTemplate,
): CloudFormationTemplate => {
  const { Resources } = template;

  const resourcesEntries = Object.entries(Resources);

  resourcesEntries.forEach(([key, resource]) => {
    if (
      ['AWS::Lambda::Function', 'AWS::Serverless::Function'].includes(
        resource.Type,
      )
    ) {
      /**
       * Check if exist a resource on template whose LogGroupName
       * Properties includes the Lambda logical id.
       */
      const logGroup = resourcesEntries.find(([, resource2]) => {
        const logGroupNameStr = JSON.stringify(
          resource2.Properties?.LogGroupName?.['Fn::Join'] || '',
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
          },
        };
      }
    }
  });

  return template;
};

const addEnvironmentsToLambdaResources = (
  template: CloudFormationTemplate,
): CloudFormationTemplate => {
  const environment = getEnvironment();

  const { Resources } = template;

  const resourcesEntries = Object.entries(Resources);

  resourcesEntries.forEach(([, resource]) => {
    if (resource.Type === 'AWS::Lambda::Function') {
      const { Properties } = resource;

      /**
       * Lambda@Edege does not support environment variables.
       * https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-requirements-limits.html#lambda-requirements-lambda-function-configuration
       * Then every function that has "Lambda@Edge" in its description will not
       * have the variables passed to Environment.Variables.
       */
      if (((Properties.Description as string) || '').includes('Lambda@Edge')) {
        return;
      }

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

export const addDefaults = async ({
  params,
  template,
}: Args): Promise<Args> => {
  const newTemplate = await [
    addDefaultParametersToTemplate,
    addLogGroupToResources,
    addEnvironmentsToLambdaResources,
  ].reduce(async (acc, addFn) => addFn(await acc), Promise.resolve(template));

  return {
    params: await addDefaultsParametersAndTagsToParams(params),
    template: newTemplate,
  };
};

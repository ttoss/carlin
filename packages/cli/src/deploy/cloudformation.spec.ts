/* eslint-disable import/first */
import * as faker from 'faker';

import { CloudFormationTemplate } from '../utils/cloudFormationTemplate';

const workingCloudFormationTemplate: CloudFormationTemplate = {
  AWSTemplateFormatVersion: '2010-09-09',
  Resources: {
    SomeResource: {
      Type: faker.random.word(),
      Properties: {},
    },
  },
};

const cloudFormationMock = jest.fn().mockReturnValue({
  validateTemplate: jest.fn(({ TemplateBody }: any) => {
    return {
      promise: () => {
        if (
          TemplateBody ===
          JSON.stringify(workingCloudFormationTemplate, null, 2)
        ) {
          return Promise.resolve();
        }

        return Promise.reject();
      },
    };
  }),
});

const deployMock = jest.fn();

jest.mock('./cloudFormation.core', () => ({
  deploy: deployMock,
  cloudFormation: cloudFormationMock,
}));

const deployLambdaCodeMock = jest.fn();

jest.mock('./lambda', () => ({
  deployLambdaCode: deployLambdaCodeMock,
}));

const stackName = faker.random.word();

jest.mock('./stackName', () => ({
  getStackName: jest.fn().mockResolvedValue(stackName),
}));

import { deployCloudFormation } from './cloudFormation';

describe('testing deployCloudFormation method', () => {
  const lambdaInput = faker.random.word();

  const lambdaExternals = [...new Array(5)].map(() => faker.random.word());

  test('return working cloudformation template if passed via template', async () => {
    deployLambdaCodeMock.mockResolvedValueOnce(undefined);

    await deployCloudFormation({
      lambdaInput,
      template: workingCloudFormationTemplate,
    });

    expect(deployMock).toHaveBeenCalledWith({
      params: {
        Parameters: [],
        StackName: stackName,
      },
      template: workingCloudFormationTemplate,
    });
  });

  test('adding Lambda S3 properties', async () => {
    const deployLambdaCodeResponse = {
      bucket: faker.random.word(),
      key: faker.random.word(),
      versionId: faker.random.word(),
    };

    deployLambdaCodeMock.mockResolvedValueOnce(deployLambdaCodeResponse);

    await deployCloudFormation({
      lambdaInput,
      lambdaExternals,
      template: workingCloudFormationTemplate,
    });

    expect(deployLambdaCodeMock).toHaveBeenCalledWith({
      lambdaExternals,
      lambdaImage: undefined,
      lambdaInput,
      stackName,
    });

    expect(deployMock).toHaveBeenCalledWith({
      params: {
        Parameters: [
          {
            ParameterKey: 'LambdaS3Bucket',
            ParameterValue: deployLambdaCodeResponse.bucket,
          },
          {
            ParameterKey: 'LambdaS3Key',
            ParameterValue: deployLambdaCodeResponse.key,
          },
          {
            ParameterKey: 'LambdaS3ObjectVersion',
            ParameterValue: deployLambdaCodeResponse.versionId,
          },
          {
            ParameterKey: 'LambdaS3Version',
            ParameterValue: deployLambdaCodeResponse.versionId,
          },
        ],
        StackName: stackName,
      },
      template: {
        ...workingCloudFormationTemplate,
        Parameters: {
          LambdaS3Bucket: {
            Type: 'String',
          },
          LambdaS3Key: {
            Type: 'String',
          },
          LambdaS3ObjectVersion: {
            Type: 'String',
          },
          LambdaS3Version: {
            Type: 'String',
          },
        },
      },
    });
  });

  test('adding Lambda image properties', async () => {
    const deployLambdaCodeResponse = {
      imageUri: faker.random.word(),
    };

    deployLambdaCodeMock.mockResolvedValueOnce(deployLambdaCodeResponse);

    await deployCloudFormation({
      lambdaImage: true,
      lambdaInput,
      lambdaExternals,
      template: workingCloudFormationTemplate,
    });

    expect(deployLambdaCodeMock).toHaveBeenCalledWith({
      lambdaExternals,
      lambdaImage: true,
      lambdaInput,
      stackName,
    });

    expect(deployMock).toHaveBeenCalledWith({
      params: {
        Parameters: [
          {
            ParameterKey: 'LambdaImageUri',
            ParameterValue: deployLambdaCodeResponse.imageUri,
          },
        ],
        StackName: stackName,
      },
      template: {
        ...workingCloudFormationTemplate,
        Parameters: {
          LambdaImageUri: {
            Type: 'String',
          },
        },
      },
    });
  });
});

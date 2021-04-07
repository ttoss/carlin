/* eslint-disable import/first */
import * as faker from 'faker';

const lambdaInput = faker.random.word();

const existsSyncMock = jest.fn((input) => {
  return lambdaInput === input;
});

jest.mock('fs', () => ({
  existsSync: existsSyncMock,
}));

import * as lambdaModule from './lambda';

describe('testing deployLambdaCode method', () => {
  const stackName = faker.random.word();

  const lambdaExternals = [...new Array(5)].map(() => faker.random.word());

  const bucket = {
    bucket: faker.random.word(),
    key: faker.random.word(),
    versionId: faker.random.word(),
  };

  (lambdaModule.buildLambdaSingleFile as jest.Mock) = jest.fn();

  (lambdaModule.uploadCodeToS3 as jest.Mock) = jest
    .fn()
    .mockResolvedValue(bucket);

  test("return undefined if lambda input doesn't exist", async () => {
    const response = await lambdaModule.deployLambdaCode({
      /**
       * Guarantee that lambda input will never be equal lambdaInput.
       */
      lambdaInput: `${faker.random.word()}${lambdaInput}`,
      lambdaExternals,
      stackName,
    });

    expect(response).toBeUndefined();
  });

  test('upload code to S3 if lambdaImage is falsy', async () => {
    (lambdaModule.deployLambdaLayers as jest.Mock) = jest.fn();

    const response = await lambdaModule.deployLambdaCode({
      lambdaInput,
      lambdaExternals,
      stackName,
    });

    expect(lambdaModule.buildLambdaSingleFile).toHaveBeenCalledWith({
      lambdaExternals,
      lambdaInput,
    });

    expect(lambdaModule.deployLambdaLayers).toHaveBeenCalledWith({
      lambdaExternals,
    });

    expect(response).toEqual(bucket);
  });

  test('upload code to ECR if lambdaImage is truth', async () => {
    const imageUri = faker.random.word();

    (lambdaModule.uploadCodeToECR as jest.Mock) = jest
      .fn()
      .mockResolvedValue({ imageUri });

    const response = await lambdaModule.deployLambdaCode({
      lambdaInput,
      lambdaExternals,
      stackName,
      lambdaImage: true,
    });

    expect(lambdaModule.buildLambdaSingleFile).toHaveBeenCalledWith({
      lambdaExternals,
      lambdaInput,
    });

    expect(lambdaModule.uploadCodeToECR).toHaveBeenCalledWith({
      ...bucket,
      lambdaExternals,
    });

    expect(response).toEqual({ imageUri });
  });
});

import { pascalCase } from 'change-case';
import faker from 'faker';

import { getEnvironment } from '../utils';

import { getStackName } from './stackName';

const branchName = [
  faker.random.words(1),
  faker.random.words(1),
  faker.random.words(1),
  faker.random.words(1),
].join('/');

const packageName = `@${faker.random.words(1)}/${faker.random.words(1)}`;

const packageNamePascalCase = pascalCase(packageName);

jest.mock('../utils', () => ({
  getCurrentBranch: jest.fn(() => branchName),
  getEnvironment: jest.fn(),
  getPackageName: jest.fn(() => packageName),
}));

describe('testing getStackName', () => {
  test('should return correct name for testing environment', async () => {
    (getEnvironment as jest.Mock).mockReturnValueOnce('Testing');
    const stackName = await getStackName();
    expect(stackName).toEqual(
      `Test${pascalCase(branchName)}-${packageNamePascalCase}`
    );
  });

  test('should return correct name for development environment', () => {
    (getEnvironment as jest.Mock).mockReturnValueOnce('Development');
    return expect(getStackName()).resolves.toEqual(
      `Dev${packageNamePascalCase}`
    );
  });

  test('should return correct name for staging environment', () => {
    (getEnvironment as jest.Mock).mockReturnValueOnce('Staging');
    return expect(getStackName()).resolves.toEqual(packageNamePascalCase);
  });

  test('should return correct name for production environment', () => {
    (getEnvironment as jest.Mock).mockReturnValueOnce('Production');
    return expect(getStackName()).resolves.toEqual(packageNamePascalCase);
  });

  describe('should return correct name when pre defined stack name is provided', () => {
    const preDefinedStackName = faker.random.word();

    test('Testing environment', () => {
      (getEnvironment as jest.Mock).mockReturnValueOnce('Testing');
      return expect(getStackName({ preDefinedStackName })).resolves.toEqual(
        `Test${preDefinedStackName}`
      );
    });

    test('Development environment', () => {
      (getEnvironment as jest.Mock).mockReturnValueOnce('Development');
      return expect(getStackName({ preDefinedStackName })).resolves.toEqual(
        `Dev${preDefinedStackName}`
      );
    });
  });
});

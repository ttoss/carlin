/* eslint-disable import/first */
import { pascalCase } from 'change-case';
import * as faker from 'faker';

const getPackageNameMock = jest.fn();

jest.mock('./packageJson', () => ({
  getPackageName: getPackageNameMock,
}));

import { cache } from './environmentVariables';

import { getProjectName } from './getProjectName';

afterEach(() => {
  cache.delete('PROJECT');
});

test('should return project name defined on cache', () => {
  const projectName = faker.random.word();
  cache.set('PROJECT', projectName);
  expect(getProjectName()).toEqual(projectName);
});

test('should return the scope of the package name', () => {
  const scope = `${faker.random.word()}`;
  getPackageNameMock.mockReturnValue(`@${scope}/${faker.random.word()}`);
  expect(getProjectName()).toEqual(pascalCase(scope));
});

test('should return the package name', () => {
  const packageName = `${faker.random.word()}`;
  getPackageNameMock.mockReturnValue(packageName);
  expect(getProjectName()).toEqual(pascalCase(packageName));
});

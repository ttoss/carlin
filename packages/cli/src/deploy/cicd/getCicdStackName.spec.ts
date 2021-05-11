/* eslint-disable import/first */
import { pascalCase } from 'change-case';
import * as faker from 'faker';

const projectName = faker.random.word();

jest.mock('../../utils/getProjectName', () => ({
  getProjectName: jest.fn().mockReturnValue(projectName),
}));

import { getCicdStackName } from './getCicdStackName';

test('stack name should contain project name', () => {
  expect(getCicdStackName()).toContain(pascalCase(projectName));
});

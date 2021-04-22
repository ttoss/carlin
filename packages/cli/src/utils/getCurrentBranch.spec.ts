/* eslint-disable import/first */
import faker from 'faker';

const branch = faker.random.word();

const branchMock = jest.fn().mockResolvedValue({ current: branch });

jest.mock('simple-git', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({
    branch: branchMock,
  }),
}));

import { cache, setEnvVar } from './environmentVariables';
import { getCurrentBranch, BRANCH_UNDEFINED } from './getCurrentBranch';

beforeEach(() => {
  cache.delete('BRANCH');
});

test('should return branch from simple-git', () => {
  return expect(getCurrentBranch()).resolves.toEqual(branch);
});

test('should return BRANCH_UNDEFINED if simple-git return undefined', () => {
  branchMock.mockRejectedValue(new Error());
  return expect(getCurrentBranch()).resolves.toEqual(BRANCH_UNDEFINED);
});

test('should return BRANCH_UNDEFINED if simple-git throw', () => {
  branchMock.mockResolvedValueOnce({ current: undefined });
  return expect(getCurrentBranch()).resolves.toEqual(BRANCH_UNDEFINED);
});

test('should return branch from process.env.BRANCH', () => {
  const newBranch = faker.random.word();
  setEnvVar('BRANCH', newBranch);
  return expect(getCurrentBranch()).resolves.toEqual(newBranch);
});

import faker from 'faker';

const branch = faker.random.word();

const branchMock = jest.fn().mockResolvedValue({ current: branch });

jest.mock('simple-git', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({
    branch: branchMock,
  }),
}));

// eslint-disable-next-line import/first
import { getCurrentBranch, BRANCH_UNDEFINED } from './getCurrentBranch';

beforeEach(() => {
  delete process.env.BRANCH;
  delete process.env.BRANCH_NAME;
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
  process.env.BRANCH = branch;
  return expect(getCurrentBranch()).resolves.toEqual(branch);
});

test('should return branch from process.env.BRANCH_NAME', () => {
  process.env.BRANCH_NAME = branch;
  return expect(getCurrentBranch()).resolves.toEqual(branch);
});

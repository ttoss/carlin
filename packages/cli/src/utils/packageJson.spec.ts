import faker from 'faker';
import { readFileSync } from 'fs';

const name = `@${faker.random.word()}/${faker.random.word()}`;

jest.mock('find-up', () => ({
  sync: jest.fn().mockReturnValue(faker.random.word()),
}));

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
}));

// eslint-disable-next-line import/first
import { getPackageName } from './packageJson';

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (readFileSync as jest.Mock) = jest.fn().mockReturnValue({
    toString: jest
      .fn()
      .mockReturnValue(`{ "name": "${name}", "version": "0.0.1" }`),
  });
});

test('should return package name', () => {
  expect(getPackageName()).toEqual(name);
});

import faker from 'faker';
import { readFileSync } from 'fs';

import { getPackageName } from './packageJson';

const name = `@${faker.random.word()}/${faker.random.word()}`;

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
}));

beforeAll(() => {
  (readFileSync as jest.Mock) = jest.fn().mockReturnValue({
    toString: jest
      .fn()
      .mockReturnValue(`{ "name": "${name}", "version": "0.0.1" }`),
  });
});

test('should return package name', () => {
  expect(getPackageName()).toEqual(name);
});

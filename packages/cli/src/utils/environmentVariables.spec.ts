import * as faker from 'faker';

import { cache, setEnvVar, getEnvVar } from './environmentVariables';

test('basic cache routines', () => {
  const key = faker.random.word();
  const value = faker.random.word();

  expect(cache.has(key)).toBeFalsy();

  cache.set(key, value);

  expect(cache.has(key)).toBeTruthy();
  expect(cache.get(key)).toEqual(value);
});

test.each((['BRANCH', 'ENVIRONMENT', 'PROJECT'] as const).map((env) => [env]))(
  '%s',
  (key) => {
    const value = faker.random.word();

    expect(cache.has(key)).toBeFalsy();

    setEnvVar(key, value);

    expect(cache.has(key)).toBeTruthy();
    expect(getEnvVar(key)).toEqual(value);
  },
);
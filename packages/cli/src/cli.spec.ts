/* eslint-disable import/first */
import * as faker from 'faker';

const region = faker.random.word();

const optionsFromConfigFiles = {
  option: faker.random.word(),
  optionEnv: faker.random.word(),
  environments: {
    Production: {
      region,
      optionEnv: faker.random.word(),
    },
  },
};

jest.mock('deepmerge', () => ({
  all: jest.fn().mockReturnValue(optionsFromConfigFiles),
}));

jest.mock('./deploy/staticApp/staticApp', () => ({
  deployStaticApp: jest.fn(),
}));

import cli from './cli';

import { deployStaticApp } from './deploy/staticApp/staticApp';

describe('handle merge config correctly', () => {
  describe('Config merging errors when default values is present #16 https://github.com/ttoss/carlin/issues/16', () => {
    test('deploy static-app --region should not be the default', async () => {
      await cli().parse('deploy static-app', { environment: 'Production' });
      expect(deployStaticApp).toHaveBeenCalledWith(
        expect.objectContaining({ region }),
      );
    });
  });

  test('argv must have the options passed to CLI', async () => {
    const options = {
      region: faker.random.word(),
    };
    const argv = await cli().parse('print-args', options);
    expect(argv.environment).toBeUndefined();
    expect(argv).toMatchObject(options);
  });

  test('argv must have the environment option', async () => {
    const argv = await cli().parse('print-args', { environment: 'Production' });
    expect(argv.environment).toBe('Production');
    expect(argv.optionEnv).toEqual(
      optionsFromConfigFiles.environments.Production.optionEnv,
    );
  });

  test('argv must have the CLI optionEnv', async () => {
    const newOptionEnv = faker.random.word();
    const argv = await cli().parse('print-args', {
      environment: 'Production',
      optionEnv: newOptionEnv,
    });
    expect(argv.environment).toBe('Production');
    expect(argv.optionEnv).toEqual(newOptionEnv);
  });
});

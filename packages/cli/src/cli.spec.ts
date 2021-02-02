/* eslint-disable import/first */
import * as faker from 'faker';

const optionsFromConfigFiles = {
  option: faker.random.word(),
  optionEnv: faker.random.word(),
  environments: {
    Production: {
      optionEnv: faker.random.word(),
    },
  },
};

jest.mock('deepmerge', () => ({
  all: jest.fn().mockReturnValue(optionsFromConfigFiles),
}));

import cli from './cli';

describe('handle options correctly', () => {
  test('argv must have the options passed to CLI', () => {
    const options = {
      region: faker.random.word(),
    };
    cli.parse('print-args', options, (_err, argv) => {
      expect(argv).toMatchObject(options);
      expect(argv).toMatchObject(options);
    });
  });

  test('argv must have the environment option', () => {
    cli.parse(
      'print-args',
      { environment: 'Production' },
      (_err: any, argv: any) => {
        expect(argv.optionEnv).toEqual(
          optionsFromConfigFiles.environments.Production.optionEnv,
        );
      },
    );
  });

  test('argv must have the CLI optionEnv', () => {
    const newOptionEnv = faker.random.word();
    cli.parse(
      'print-args',
      {
        environment: 'Production',
        optionEnv: newOptionEnv,
      },
      (_err: any, argv: any) => {
        expect(argv.optionEnv).toEqual(newOptionEnv);
      },
    );
  });
});

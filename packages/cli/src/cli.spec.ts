/* eslint-disable import/first */
import AWS from 'aws-sdk';
import * as faker from 'faker';

import { cloudFormation } from './deploy/cloudFormation.core';

const region = 'us-east-1';

const optionsFromConfigFiles = {
  option: 'option',
  optionEnv: 'optionEnv',
  optionEnvArray: ['optionEnvArray1', 'optionEnvArray2'],
  optionEnvObj: {
    a: 'optionEnvObjA',
    b: 2,
  },
  environments: {
    Production: {
      region,
      optionEnv: 'optionEnvProduction',
      optionEnvArray: [
        'optionEnvArrayProduction1',
        'optionEnvArrayProduction2',
      ],
      optionEnvObj: {
        a: 'optionEnvObjProductionA',
        b: 3,
      },
    },
  },
};

jest.mock('deepmerge', () => ({
  all: jest.fn().mockReturnValue(optionsFromConfigFiles),
}));

jest.mock('find-up', () => ({
  sync: jest
    .fn()
    .mockReturnValueOnce('./some-dir')
    .mockReturnValueOnce(undefined),
}));

jest.mock('./deploy/baseStack/deployBaseStack', () => ({
  ...(jest.requireActual('./deploy/baseStack/deployBaseStack') as any),
  deployBaseStack: jest.fn(),
}));

import { getCurrentBranch, getEnvironment, getProjectName } from './utils';

import cli from './cli';

import { deployBaseStack } from './deploy/baseStack/deployBaseStack';

const parse = async (arg: any, context: any) => {
  return cli().strict(false).parse(arg, context);
};

test('set AWS region', async () => {
  const argv = await parse(`print-args --region=${region}`, {});
  expect(argv.region).toEqual(region);
  expect(AWS.config.region).toEqual(region);
  expect(await cloudFormation().config.region()).toEqual(region);
});

describe('environment type', () => {
  beforeAll(() => {
    delete process.env.CARLIN_ENVIRONMENT;
  });

  test('throw error if it is an object', () => {
    expect(() =>
      parse(`print-args`, {
        environment: { obj: faker.random.word() },
      }),
    ).rejects.toThrow();
  });

  test('throw error if it is an array', () => {
    expect(() =>
      parse(`print-args`, {
        environment: [faker.random.word()],
      }),
    ).rejects.toThrow();
  });

  test("don't throw error if it is a string", async () => {
    const environment = faker.random.word();
    const argv = await parse(`print-args`, { environment });
    expect(argv.environment).toEqual(environment);
  });

  test("don't throw error if it is a string", async () => {
    const argv = await parse(`print-args`, {});
    expect(argv.environment).toBeUndefined();
  });
});

describe('validating environment variables', () => {
  afterEach(() => {
    delete process.env.CARLIN_BRANCH;
    delete process.env.CARLIN_ENVIRONMENT;
    delete process.env.CARLIN_PROJECT;
  });

  const generateRandomVariables = () => ({
    branch: faker.random.word(),
    environment: faker.random.word(),
    project: faker.random.word(),
  });

  const testExpects = async ({ argv, branch, environment, project }: any) => {
    expect(await getCurrentBranch()).toEqual(branch);
    expect(argv.branch).toEqual(branch);

    expect(getEnvironment()).toEqual(environment);
    expect(argv.environment).toEqual(environment);

    expect(getProjectName()).toEqual(project);
    expect(argv.project).toEqual(project);
  };

  test('passing by options', async () => {
    const { branch, environment, project } = generateRandomVariables();

    /**
     * Use options this way to coerce to work.
     */
    const options = [
      `--branch=${branch}`,
      `--environment=${environment}`,
      `--project=${project}`,
    ].join(' ');

    const argv = await parse(`print-args ${options}`, {});

    await testExpects({ argv, branch, environment, project });
  });

  test('passing by process.env', async () => {
    const { branch, environment, project } = generateRandomVariables();

    process.env.CARLIN_BRANCH = branch;
    process.env.CARLIN_ENVIRONMENT = environment;
    process.env.CARLIN_PROJECT = project;

    const argv = await parse('print-args', {});

    await testExpects({ argv, branch, environment, project });
  });
});

describe('handle merge config correctly', () => {
  describe('Config merging errors when default values is present #16 https://github.com/ttoss/carlin/issues/16', () => {
    test('deploy base-stack --region should not be the default', async () => {
      await parse('deploy base-stack', {
        environment: 'Production',
      });
      expect(deployBaseStack).toHaveBeenCalledWith(
        expect.objectContaining({ region }),
      );
    });
  });

  test('argv must have the options passed to CLI', async () => {
    const options = {
      region: faker.random.word(),
    };
    const argv = await parse('print-args', options);
    expect(argv.environment).toBeUndefined();
    expect(argv).toMatchObject(options);
  });

  test('argv must have the environment option', async () => {
    const argv = await parse('print-args', { environment: 'Production' });
    expect(argv.environment).toBe('Production');
    expect(argv.optionEnv).toEqual(
      optionsFromConfigFiles.environments.Production.optionEnv,
    );
    expect(argv.optionEnvArray).toEqual(
      optionsFromConfigFiles.environments.Production.optionEnvArray,
    );
    expect(argv.optionEnvObj).toEqual(
      optionsFromConfigFiles.environments.Production.optionEnvObj,
    );
  });

  test('argv must have the CLI optionEnv', async () => {
    const newOptionEnv = faker.random.word();
    const argv = await parse('print-args', {
      environment: 'Production',
      optionEnv: newOptionEnv,
    });
    expect(argv.environment).toBe('Production');
    expect(argv.optionEnv).toEqual(newOptionEnv);
  });
});

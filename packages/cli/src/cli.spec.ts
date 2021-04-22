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

jest.mock('find-up', () => ({
  sync: jest
    .fn()
    .mockReturnValueOnce('./some-dir')
    .mockReturnValueOnce(undefined),
}));

jest.mock('./deploy/staticApp/staticApp', () => ({
  ...(jest.requireActual('./deploy/staticApp/staticApp') as any),
  deployStaticApp: jest.fn(),
}));

import { getCurrentBranch, getEnvironment, getProjectName } from './utils';

import cli from './cli';

import { deployStaticApp } from './deploy/staticApp/staticApp';

const parse = async (arg: any, context: any) => {
  return cli().strict(false).parse(arg, context);
};

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
    test('deploy static-app --region should not be the default', async () => {
      await parse('deploy static-app', {
        environment: 'Production',
      });
      expect(deployStaticApp).toHaveBeenCalledWith(
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

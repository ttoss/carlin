/* eslint-disable import/first */
import faker from 'faker';
import yargs from 'yargs';

const deployCloudFormationMock = jest.fn();

const destroyCloudFormationMock = jest.fn();

jest.mock('./cloudFormation', () => ({
  deployCloudFormation: deployCloudFormationMock,
  destroyCloudFormation: destroyCloudFormationMock,
}));

import { getEnvVar } from '../utils/environmentVariables';

import { getStackName, setPreDefinedStackName } from './stackName';

import * as commandModule from './command';

const cli = yargs.command(commandModule.deployCommand);

const parse = (command: string, options: any = {}) =>
  new Promise<any>((resolve, reject) => {
    cli.parse(command, options, (err, argv) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(argv);
    });
  });

describe('stack name and cache', () => {
  beforeEach(() => {
    setPreDefinedStackName('');
  });

  afterAll(() => {
    setPreDefinedStackName('');
  });

  test('should save stack name on cache', async () => {
    const stackName = faker.random.word();
    const argv = await parse('deploy', { stackName });
    expect(argv.stackName).toEqual(stackName);
    expect(await getStackName()).toEqual(stackName);
  });

  test('cache should not have stack name', async () => {
    const argv = await parse('deploy');
    expect(argv.stackName).toBeUndefined();
    expect(getEnvVar('STACK_NAME')).toBeUndefined();
  });
});

describe('lambda-dockerfile', () => {
  test("should return empty string if Dockerfile doesn't exists", async () => {
    (commandModule.readDockerfile as jest.Mock) = jest
      .fn()
      .mockReturnValue(new Error());

    const { lambdaDockerfile, lambdaImage } = await parse('', {});

    expect(lambdaDockerfile).toBeUndefined();
    expect(lambdaImage).toBeFalsy();
  });

  test('should return Dockerfile if default exists', async () => {
    const dockerfile = faker.random.words();

    (commandModule.readDockerfile as jest.Mock) = jest
      .fn()
      .mockReturnValue(dockerfile);

    const { lambdaDockerfile, lambdaImage } = await parse('deploy', {});

    expect(commandModule.readDockerfile).toHaveBeenCalledWith(
      commandModule.options['lambda-dockerfile'].default,
    );

    expect(lambdaDockerfile).toEqual(dockerfile);
    expect(lambdaImage).toBeTruthy();
  });
});

describe('handlers', () => {
  test('should call deployCloudFormation', async () => {
    await parse('deploy');
    expect(deployCloudFormationMock).toHaveBeenCalled();
  });

  test('should call destroyCloudFormation', async () => {
    await parse('deploy', { destroy: true });
    expect(destroyCloudFormationMock).toHaveBeenCalled();
  });
});

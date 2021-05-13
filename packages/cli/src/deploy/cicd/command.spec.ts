/* eslint-disable import/first */
import faker from 'faker';
import yargs from 'yargs';

const deployCicdMock = jest.fn();

jest.mock('./deployCicd', () => ({
  deployCicd: deployCicdMock,
}));

import * as commandModule from './command';

const cli = yargs.command(commandModule.deployCicdCommand);

const parse = (command: string, options: any = {}) =>
  new Promise<any>((resolve, reject) => {
    cli.parse(command, options, (err, argv) => {
      if (err) {
        reject(err);
      } else {
        resolve(argv);
      }
    });
  });

test('should call deployCicd with ssh args', async () => {
  const sshKey = faker.random.word();
  const readSSHKeyMockedValue = faker.random.word();
  const sshUrl = faker.random.word();

  (commandModule.readSSHKey as jest.Mock) = jest
    .fn()
    .mockReturnValue(readSSHKeyMockedValue);

  const argv = await parse(`cicd --ssh-key=${sshKey} --ssh-url=${sshUrl}`);

  expect(argv).toEqual(expect.objectContaining({ sshKey, sshUrl }));
  expect(deployCicdMock).toHaveBeenCalledWith(
    expect.objectContaining({
      sshKey: readSSHKeyMockedValue,
      sshUrl,
    }),
  );
});

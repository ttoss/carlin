import cli from 'pepe-cli/dist/cli';

export const commands = [
  'monorepo',
  'deploy',
  'deploy pepe-base',
  'deploy static-app',
];

export const getHelpText = async (cmd: string): Promise<string> =>
  new Promise((resolve) => {
    cli.parse(cmd, { help: true }, (_, __, output) => {
      resolve(output);
    });
  });

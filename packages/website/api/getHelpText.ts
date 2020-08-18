import cli from 'carlin/dist/cli';

export const getHelpText = async (cmd: string): Promise<string> =>
  new Promise((resolve) => {
    cli.parse(cmd, { help: true }, (_, __, output) => {
      resolve(output);
    });
  });

import { CommandModule } from 'yargs';

import { monorepo } from './monorepo';

export const monorepoCommand: CommandModule<
  any,
  { name?: string; update?: boolean; skipInstall?: boolean }
> = {
  command: 'monorepo [name]',
  describe: 'Create or update the monorepo repository configuration.',
  builder: (yargs) => {
    yargs.positional('name', {
      describe: 'Monorepo name.',
      conflicts: 'update',
      type: 'string',
    });
    yargs.options({
      'skip-install': {
        required: false,
        type: 'boolean',
      },
      update: {
        conflicts: 'name',
        required: false,
        type: 'boolean',
      },
    });
    yargs.check(({ name, update }) => {
      if (name || update) {
        return true;
      }
      throw new Error('"name" or "update" must exists.');
    });
    return yargs;
  },
  handler: monorepo,
};

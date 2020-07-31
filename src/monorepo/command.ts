import { CommandModule } from 'yargs';

import { monorepo } from './monorepo';

export const monorepoCommand: CommandModule<any, {}> = {
  command: 'monorepo',
  describe: 'Update the repository to monorepo.',
  builder: (yargs) => yargs,
  handler: monorepo,
};

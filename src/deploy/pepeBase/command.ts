import { CommandModule } from 'yargs';

import { deployPepeBase } from './pepeBase';

export const deployPepeBaseCommand: CommandModule = {
  command: 'pepe-base',
  describe: 'Create Pepe base resources.',
  builder: (yargs) => yargs,
  handler: deployPepeBase,
};

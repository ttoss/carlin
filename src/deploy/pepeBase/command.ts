import { CommandModule } from 'yargs';

import { deployPepeBase } from './pepeBase';

export const deployPepeBaseCommand: CommandModule<
  any,
  { createPepeBucket?: boolean }
> = {
  command: 'pepe-base',
  describe: 'Create Pepe base resources.',
  builder: (yargs) =>
    yargs.options({
      createPepeBucket: {
        default: true,
        require: false,
        type: 'boolean',
      },
    }),
  handler: deployPepeBase,
};

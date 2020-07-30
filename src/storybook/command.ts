import { CommandModule } from 'yargs';

import { runStorybook } from './storybook';

export const storybookCommand: CommandModule<any, { stories?: string[] }> = {
  command: 'storybook',
  describe: 'Run storybook',
  builder: (yargs) =>
    yargs.options({
      stories: {
        array: true,
        description: 'Stories file pattern.',
        type: 'string',
      },
    }),
  handler: runStorybook,
};

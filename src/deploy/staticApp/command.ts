import { CommandModule } from 'yargs';

import { destroyCloudFormation } from '../cloudFormation';

import { deployStaticApp } from './staticApp';

export const deployStaticAppCommand: CommandModule<
  { destroy: boolean },
  { buildFolder: string; cloudfront: boolean; destroy: boolean; edge: boolean }
> = {
  command: 'static-app',
  describe: 'Static app deploy.',
  builder: (yargs) =>
    yargs.options({
      buildFolder: {
        default: 'build',
        required: false,
        type: 'string',
      },
      cloudfront: {
        default: false,
        require: false,
        type: 'boolean',
      },
      edge: {
        default: false,
        require: false,
        type: 'boolean',
      },
    }),
  handler: ({ destroy, ...rest }) => {
    console.log({ ...rest });
    if (destroy) {
      destroyCloudFormation();
    } else {
      deployStaticApp(rest);
    }
  },
};

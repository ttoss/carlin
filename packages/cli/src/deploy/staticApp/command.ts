import { CommandModule } from 'yargs';

import { destroyCloudFormation } from '../cloudFormation';

import { deployStaticApp } from './staticApp';

export const deployStaticAppCommand: CommandModule<
  { destroy: boolean },
  {
    buildFolder: string;
    cloudfront: boolean;
    destroy?: boolean;
    edge: boolean;
    hostedZoneName?: string;
  }
> = {
  command: 'static-app',
  describe: 'Static app deploy.',
  builder: (yargs) =>
    yargs.options({
      acmArn: {
        type: 'string',
      },
      acmArnExportedName: {
        type: 'string',
      },
      aliases: {
        describe: 'CloudFront aliases.',
        type: 'array',
      },
      buildFolder: {
        default: 'build',
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
      hostedZoneName: {
        required: false,
        type: 'string',
      },
    }),
  handler: ({ destroy, ...rest }) => {
    if (destroy) {
      destroyCloudFormation();
    } else {
      deployStaticApp(rest);
    }
  },
};

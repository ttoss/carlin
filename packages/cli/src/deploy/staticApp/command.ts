/* eslint-disable no-param-reassign */
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
    yargs
      .options({
        acmArn: {
          aliases: ['acm-arn'],
          conflicts: 'acmArnExportedName',
          type: 'string',
        },
        acmArnExportedName: {
          aliases: ['acm-arn-exported-name'],
          conflicts: 'acmArn',
          type: 'string',
        },
        aliases: {
          describe: 'CloudFront aliases.',
          type: 'array',
        },
        buildFolder: {
          aliases: ['build-folder'],
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
          aliases: ['hosted-zone-name'],
          required: false,
          type: 'string',
        },
      })
      .middleware((argv) => {
        const { acmArn, acmArnExportedName, aliases, edge } = argv;
        if (acmArn || acmArn || aliases || edge) {
          argv.cloudfront = true;
        }
        if (aliases && !(acmArn || acmArnExportedName)) {
          throw new Error(
            '"alias" is defined but "acm-arn" or "acm-arn-exported-name" is not.',
          );
        }
      }),
  handler: ({ destroy, ...rest }) => {
    if (destroy) {
      destroyCloudFormation();
    } else {
      deployStaticApp(rest);
    }
  },
};

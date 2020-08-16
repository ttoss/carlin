/* eslint-disable no-param-reassign */
import { CommandModule } from 'yargs';

import { destroyCloudFormation } from '../cloudFormation';

import { deployStaticApp } from './staticApp';

export const deployStaticAppCommand: CommandModule = {
  command: 'static-app',
  describe: 'Static app deploy.',
  builder: (yargs) =>
    yargs
      .options({
        'acm-arn': {
          conflicts: 'acmArnExportedName',
          group: 'aaa',
          type: 'string',
        },
        'acm-arn-exported-name': {
          conflicts: 'acmArn',
          group: 'aaa',
          type: 'string',
        },
        aliases: {
          describe: 'CloudFront aliases.',
          type: 'array',
        },
        'build-folder': {
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
        'hosted-zone-name': {
          required: false,
          type: 'string',
        },
      })
      .middleware((argv) => {
        const { acmArn, aliases, edge } = argv;
        if (acmArn || acmArn || aliases || edge) {
          argv.cloudfront = true;
        }
      })
      .check(({ aliases, acmArnExportedName, acmArn }) => {
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
      deployStaticApp(rest as any);
    }
  },
};

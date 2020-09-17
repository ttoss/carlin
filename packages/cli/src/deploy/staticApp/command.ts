/* eslint-disable no-param-reassign */
import { CommandModule } from 'yargs';

import { NAME } from '../../config';

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
          describe:
            'The ARN of the certificate that will be associated to CloudFront.',
          type: 'string',
        },
        'acm-arn-exported-name': {
          conflicts: 'acmArn',
          describe:
            'The exported name of the ARN value of the ACM if it was created via CloudFormation.',
          type: 'string',
        },
        aliases: {
          describe:
            'The aliases that will be associated with the CloudFront. https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/CNAMEs.html',
          type: 'array',
        },
        'build-folder': {
          default: 'build',
          type: 'string',
        },
        cloudfront: {
          default: false,
          describe:
            'A CloudFront resource is created along with S3 if this option is `true`.',
          require: false,
          type: 'boolean',
        },
        scp: {
          describe: 'SCP headers to be added to Lambda@Edge origin response.',
          type: 'array',
        },
        spa: {
          default: false,
          describe:
            'This option enables CloudFront to serve a single page application (SPA).',
          require: false,
          type: 'boolean',
        },
        'hosted-zone-name': {
          required: false,
          describe: `Is the name of a Route 53 hosted zone. If this value is provided, ${NAME} creates the subdomains defined on \`--aliases\` option. E.g. if you have a hosted zone named "sub.domain.com", the value provided may be "sub.domain.com".`,
          type: 'string',
        },
      })
      .middleware((argv) => {
        const { acmArn, acmArnExportedName, aliases, spa } = argv;
        if (acmArn || acmArnExportedName || aliases || spa) {
          argv.cloudfront = true;
        }
      })
      .check(({ aliases, acmArnExportedName, acmArn }) => {
        if (aliases && !(acmArn || acmArnExportedName)) {
          throw new Error(
            '"alias" is defined but "acm-arn" or "acm-arn-exported-name" is not.',
          );
        } else {
          return true;
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

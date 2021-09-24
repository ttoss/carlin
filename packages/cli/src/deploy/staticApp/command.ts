/* eslint-disable no-param-reassign */
import AWS from 'aws-sdk';
import { CommandModule, InferredOptionTypes } from 'yargs';

import { NAME, CLOUDFRONT_REGION } from '../../config';
import { addGroupToOptions } from '../../utils';

import { destroyCloudFormation } from '../cloudFormation';

import { deployStaticApp, defaultBuildFolders } from './staticApp';

export const options = {
  acm: {
    describe:
      'The ARN of the certificate or the name of the exported variable whose value is the ARN of the certificate that will be associated to CloudFront.',
    type: 'string',
  },
  aliases: {
    describe:
      'The aliases that will be associated with the CloudFront. See https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/CNAMEs.html',
    implies: ['acm'],
    type: 'array',
  },
  'build-folder': {
    describe: `The folder that will be uploaded. If not provided, it'll search for the folders "${defaultBuildFolders.join(
      ', ',
    )}."`,
    type: 'string',
  },
  cloudfront: {
    default: false,
    describe:
      'A CloudFront resource is created along with S3 if this option is `true`.',
    require: false,
    type: 'boolean',
  },
  csp: {
    coerce: (value: any) => {
      if (value === 'false') {
        return false;
      }

      return value;
    },
    describe: 'CSP headers to be added to Lambda@Edge origin response.',
  },
  'gtm-id': {
    describe: 'Id of the GTM container.',
    require: false,
    type: 'string',
  },
  'hosted-zone-name': {
    required: false,
    describe: `Is the name of a Route 53 hosted zone. If this value is provided, ${NAME} creates the subdomains defined on \`--aliases\` option. E.g. if you have a hosted zone named "sub.domain.com", the value provided may be "sub.domain.com".`,
    type: 'string',
  },
  /**
   * CloudFront triggers can be only in US East (N. Virginia) Region.
   * https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-requirements-limits.html#lambda-requirements-cloudfront-triggers
   */
  region: {
    coerce: () => CLOUDFRONT_REGION,
    default: CLOUDFRONT_REGION,
    hidden: true,
    type: 'string',
  },
  'skip-upload': {
    default: false,
    describe:
      'Skip files upload to S3. Useful when wanting update only CloudFormation.',
    type: 'boolean',
  },
  spa: {
    default: false,
    describe:
      'This option enables CloudFront to serve a single page application (SPA).',
    require: false,
    type: 'boolean',
  },
} as const;

export const deployStaticAppCommand: CommandModule<
  any,
  InferredOptionTypes<typeof options>
> = {
  command: 'static-app',
  describe: 'Deploy static app.',
  builder: (yargs) =>
    yargs
      .options(addGroupToOptions(options, 'Deploy Static App Options'))
      /**
       * CloudFront triggers can be only in US East (N. Virginia) Region.
       * https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-requirements-limits.html#lambda-requirements-cloudfront-triggers
       */
      .middleware(() => {
        AWS.config.region = CLOUDFRONT_REGION;
      }),
  handler: ({ destroy, ...rest }) => {
    if (destroy) {
      destroyCloudFormation();
    } else {
      deployStaticApp(rest as any);
    }
  },
};

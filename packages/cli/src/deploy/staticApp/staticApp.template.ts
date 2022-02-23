/* eslint-disable no-template-curly-in-string */

import {
  CloudFormationTemplate,
  Resource,
  Output,
  getPackageVersion,
} from '../../utils';

import { getOriginShieldRegion } from './getOriginShieldRegion';

const PACKAGE_VERSION = getPackageVersion();

const STATIC_APP_BUCKET_LOGICAL_ID = 'StaticBucket';

const CLOUDFRONT_DISTRIBUTION_ID = 'CloudFrontDistributionId';

const CLOUDFRONT_DISTRIBUTION_ORIGIN_ACCESS_IDENTITY_LOGICAL_ID =
  'CloudFrontDistributionOriginAccessIdentity';

export const CLOUDFRONT_DISTRIBUTION_LOGICAL_ID = 'CloudFrontDistribution';

export const ROUTE_53_RECORD_SET_GROUP_LOGICAL_ID = 'Route53RecordSetGroup';

/**
 * Name: Managed-CachingOptimized
 * ID: 658327ea-f89d-4fab-a63d-7e88639e58f6
 * https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html
 */
const CACHE_POLICY_ID = '658327ea-f89d-4fab-a63d-7e88639e58f6';

/**
 * Name: Managed-CORS-S3Origin
 * ID: 88a5eaf4-2fd4-4709-b370-b4c650ea3fcf
 * https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-origin-request-policies.html
 */
const ORIGIN_REQUEST_POLICY_ID = '88a5eaf4-2fd4-4709-b370-b4c650ea3fcf';

/**
 * Name: CORS-with-preflight-and-SecurityHeadersPolicy
 * ID: eaab4381-ed33-4a86-88ca-d9558dc6cd63
 * https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-response-headers-policies.html
 */
const ORIGIN_RESPONSE_POLICY_ID = 'eaab4381-ed33-4a86-88ca-d9558dc6cd63';

const getBaseTemplate = ({
  cloudfront,
  spa,
}: {
  cloudfront?: boolean;
  spa?: boolean;
}): CloudFormationTemplate => {
  return {
    AWSTemplateFormatVersion: '2010-09-09',
    Resources: {
      [STATIC_APP_BUCKET_LOGICAL_ID]: {
        Type: 'AWS::S3::Bucket',
        Properties: {
          CorsConfiguration: {
            CorsRules: [
              {
                AllowedHeaders: ['*'],
                AllowedMethods: ['GET'],
                AllowedOrigins: ['*'],
                Id: 'OpenCors',
                MaxAge: 600,
              },
            ],
          },
          WebsiteConfiguration: {
            IndexDocument: `index.html`,
            ErrorDocument: `${spa ? 'index' : '404'}.html`,
          },
        },
      },
      [`${STATIC_APP_BUCKET_LOGICAL_ID}S3BucketPolicy`]: {
        Type: 'AWS::S3::BucketPolicy',
        Properties: {
          Bucket: { Ref: STATIC_APP_BUCKET_LOGICAL_ID },
          PolicyDocument: {
            Statement: [
              {
                Action: ['s3:GetObject'],
                Effect: 'Allow',
                Resource: {
                  'Fn::Join': [
                    '',
                    [
                      'arn:aws:s3:::',
                      { Ref: STATIC_APP_BUCKET_LOGICAL_ID },
                      '/*',
                    ],
                  ],
                },
                Principal: cloudfront
                  ? /**
                     * https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
                     */
                    {
                      AWS: {
                        'Fn::Sub': [
                          'arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity ${OAI}',
                          {
                            OAI: {
                              Ref: CLOUDFRONT_DISTRIBUTION_ORIGIN_ACCESS_IDENTITY_LOGICAL_ID,
                            },
                          },
                        ],
                      },
                    }
                  : '*',
              },
            ],
          },
        },
      },
    },
    Outputs: {
      BucketWebsiteURL: {
        Description: 'Bucket static app website URL',
        Value: {
          'Fn::GetAtt': [STATIC_APP_BUCKET_LOGICAL_ID, 'WebsiteURL'],
        },
      },
    },
  };
};

const getCloudFrontTemplate = ({
  acm,
  aliases,
  cloudfront,
  spa,
  hostedZoneName,
  region,
}: {
  acm?: string;
  aliases?: string[];
  cloudfront: boolean;
  spa?: boolean;
  hostedZoneName?: string;
  region: string;
}): CloudFormationTemplate => {
  const template = { ...getBaseTemplate({ cloudfront, spa }) };

  const cloudFrontResources: { [key: string]: Resource } = {
    [CLOUDFRONT_DISTRIBUTION_ORIGIN_ACCESS_IDENTITY_LOGICAL_ID]: {
      Type: 'AWS::CloudFront::CloudFrontOriginAccessIdentity',
      Properties: {
        CloudFrontOriginAccessIdentityConfig: {
          Comment: {
            'Fn::Sub': [
              'CloudFront Distribution Origin Access Identity for ${Project} project.',
              { Project: { Ref: 'Project' } },
            ],
          },
        },
      },
    },
    [CLOUDFRONT_DISTRIBUTION_LOGICAL_ID]: {
      Type: 'AWS::CloudFront::Distribution',
      Properties: {
        DistributionConfig: {
          Comment: {
            'Fn::Sub': [
              'CloudFront Distribution for ${Project} project.',
              { Project: { Ref: 'Project' } },
            ],
          },
          CustomErrorResponses: [403, 404].map((errorCode) => {
            if (spa) {
              return {
                ErrorCachingMinTTL: 60 * 60 * 24,
                ErrorCode: errorCode,
                ResponseCode: 200,
                ResponsePagePath: '/index.html',
              };
            }

            return {
              ErrorCachingMinTTL: 0,
              ErrorCode: errorCode,
              ResponseCode: 404,
              ResponsePagePath: '/404.html',
            };
          }),
          DefaultCacheBehavior: {
            AllowedMethods: ['GET', 'HEAD', 'OPTIONS'],
            Compress: true,
            /**
             * Caching OPTIONS. Related to OriginRequestPolicyId property.
             * https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/header-caching.html#header-caching-web-cors
             */
            CachedMethods: ['GET', 'HEAD', 'OPTIONS'],
            OriginRequestPolicyId: ORIGIN_REQUEST_POLICY_ID,
            /**
             * CachePolicyId property:
             * https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-cloudfront-distribution-defaultcachebehavior.html#cfn-cloudfront-distribution-defaultcachebehavior-cachepolicyid
             */
            CachePolicyId: CACHE_POLICY_ID,
            ResponseHeadersPolicyId: ORIGIN_RESPONSE_POLICY_ID,
            TargetOriginId: { Ref: STATIC_APP_BUCKET_LOGICAL_ID },
            ViewerProtocolPolicy: 'redirect-to-https',
          },
          DefaultRootObject: 'index.html',
          Enabled: true,
          HttpVersion: 'http2',
          Origins: [
            {
              /**
               * Amazon S3 bucket – awsexamplebucket.s3.us-west-2.amazonaws.com
               * https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-web-values-specify.html#DownloadDistValuesDomainName
               */
              DomainName: {
                'Fn::GetAtt': `${STATIC_APP_BUCKET_LOGICAL_ID}.RegionalDomainName`,
              },
              Id: { Ref: STATIC_APP_BUCKET_LOGICAL_ID },
              OriginPath: `/${PACKAGE_VERSION}`,
              /**
               * https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/origin-shield.html#choose-origin-shield-region
               */
              ...(region && {
                OriginShield: {
                  Enabled: true,
                  OriginShieldRegion: getOriginShieldRegion(region),
                },
              }),
              S3OriginConfig: {
                OriginAccessIdentity: {
                  'Fn::Join': [
                    '/',
                    [
                      'origin-access-identity',
                      'cloudfront',
                      {
                        Ref: CLOUDFRONT_DISTRIBUTION_ORIGIN_ACCESS_IDENTITY_LOGICAL_ID,
                      },
                    ],
                  ],
                },
              },
            },
          ],
        },
      },
    },
  };

  if (acm) {
    const acmRegex = /^arn:aws:acm:[-a-z0-9]+:\d{12}:certificate\/[-a-z0-9]+$/;

    const acmCertificateArn = acmRegex.test(acm)
      ? acm
      : {
          'Fn::ImportValue': acm,
        };

    /**
     * Add ACM to CloudFront template.
     */
    cloudFrontResources.CloudFrontDistribution.Properties.DistributionConfig = {
      ...cloudFrontResources.CloudFrontDistribution.Properties
        .DistributionConfig,
      Aliases: aliases || { Ref: 'AWS::NoValue' },
      ViewerCertificate: {
        AcmCertificateArn: acmCertificateArn,
        /**
         * AWS CloudFront recommendation.
         */
        MinimumProtocolVersion: 'TLSv1.2_2021',
        SslSupportMethod: 'sni-only',
      },
    };
  }

  /**
   * Add aliases to Route 53 records.
   */
  if (hostedZoneName && aliases) {
    const recordSets = aliases.map((alias) => {
      if (alias === hostedZoneName) {
        return {
          AliasTarget: {
            DNSName: {
              'Fn::GetAtt': `${CLOUDFRONT_DISTRIBUTION_LOGICAL_ID}.DomainName`,
            },
            /**
             * https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-route53-aliastarget.html#cfn-route53-aliastarget-hostedzoneid
             */
            HostedZoneId: 'Z2FDTNDATAQYW2',
          },
          Name: alias,
          Type: 'A',
        };
      }

      return {
        Name: alias,
        ResourceRecords: [
          {
            'Fn::GetAtt': `${CLOUDFRONT_DISTRIBUTION_LOGICAL_ID}.DomainName`,
          },
        ],
        TTL: 60,
        Type: 'CNAME',
      };
    });

    const route53RecordSetGroupResources: { [key: string]: Resource } = {
      [ROUTE_53_RECORD_SET_GROUP_LOGICAL_ID]: {
        Type: 'AWS::Route53::RecordSetGroup',
        DependsOn: [CLOUDFRONT_DISTRIBUTION_LOGICAL_ID],
        Properties: {
          // https://forums.aws.amazon.com/thread.jspa?threadID=103919
          HostedZoneName: `${hostedZoneName}${
            hostedZoneName.endsWith('.') ? '' : '.'
          }`,
          RecordSets: recordSets,
        },
      },
    };

    template.Resources = {
      ...template.Resources,
      ...route53RecordSetGroupResources,
    };
  }

  template.Resources = { ...template.Resources, ...cloudFrontResources };

  /**
   * Add aliases output to template.
   */
  const aliasesOutput = (aliases || []).reduce<{ [key: string]: Output }>(
    (acc, alias, index) => ({
      ...acc,
      [`Alias${index}URL`]: {
        Value: `https://${alias}`,
      },
    }),
    {},
  );

  /**
   * Add CloudFront Distribution ID and CloudFront URL to template.
   */
  template.Outputs = {
    ...template.Outputs,
    ...aliasesOutput,
    CloudFrontURL: {
      Value: {
        'Fn::Join': [
          '',
          [
            'https://',
            {
              'Fn::GetAtt': `${CLOUDFRONT_DISTRIBUTION_LOGICAL_ID}.DomainName`,
            },
          ],
        ],
      },
    },
    [CLOUDFRONT_DISTRIBUTION_ID]: {
      Value: {
        Ref: CLOUDFRONT_DISTRIBUTION_LOGICAL_ID,
      },
    },
    CurrentVersion: {
      Value: PACKAGE_VERSION,
    },
  };

  return template;
};

export const getStaticAppTemplate = ({
  acm,
  aliases,
  cloudfront,
  spa,
  hostedZoneName,
  region,
}: {
  acm?: string;
  aliases?: string[];
  cloudfront?: boolean;
  spa?: boolean;
  hostedZoneName?: string;
  region: string;
}): CloudFormationTemplate => {
  if (cloudfront) {
    return getCloudFrontTemplate({
      acm,
      aliases,
      cloudfront,
      spa,
      hostedZoneName,
      region,
    });
  }
  return getBaseTemplate({ cloudfront, spa });
};

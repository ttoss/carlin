/* eslint-disable no-template-curly-in-string */

/**
 * Some implementation idea was taken from here:
 * https://gist.github.com/jed/56b1f58297d374572bc51c59394c7e7f
 */
import { NAME } from '../../config';
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

const LAMBDA_EDGE_IAM_ROLE_LOGICAL_ID = 'LambdaEdgeIAMRole';

const PUBLISH_LAMBDA_VERSION_ROLE_LOGICAL_ID = 'PublishLambdaVersionRole';

const PUBLISH_LAMBDA_VERSION_LOGICAL_ID = 'PublishLambdaVersion';

const PUBLISH_LAMBDA_VERSION_ZIP_FILE = `
const {Lambda} = require('aws-sdk')
const {send, SUCCESS, FAILED} = require('cfn-response')
const lambda = new Lambda()
exports.handler = (event, context) => {
  const {RequestType, ResourceProperties: {FunctionName}} = event
  if (RequestType == 'Delete') return send(event, context, SUCCESS)
  lambda.publishVersion({FunctionName}, (err, {FunctionArn}) => {
    err
      ? send(event, context, FAILED, err)
      : send(event, context, SUCCESS, {FunctionArn})
  })
}
`.trim();

const LAMBDA_EDGE_VIEWER_REQUEST_LOGICAL_ID = 'LambdaEdgeOriginRequest';

const LAMBDA_EDGE_VERSION_VIEWER_REQUEST_LOGICAL_ID =
  'LambdaEdgeVersionOriginRequest';

const LAMBDA_EDGE_VIEWER_REQUEST_ZIP_FILE = `
exports.handler = (event, context, callback) => {
  const request = event.Records[0].cf.request;

  if (request.uri.endsWith('/')) {
    request.uri += 'index.html';
  } else if (!request.uri.includes('.')) {
    request.uri += '.html';
  }

  callback(null, request);
};
`.trim();

const LAMBDA_EDGE_ORIGIN_RESPONSE_LOGICAL_ID = 'LambdaEdgeOriginResponse';

const LAMBDA_EDGE_VERSION_ORIGIN_RESPONSE_LOGICAL_ID =
  'LambdaEdgeVersionOriginResponse';

/**
 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy
 */
const defaultScp = [
  "default-src 'self'",
  /**
   * Fetch APIs, only if start with HTTPS.
   */
  "connect-src 'self' https:",
  "img-src 'self'",
  "script-src 'self'",
  "style-src 'self' https://fonts.googleapis.com/",
  "font-src 'self' https://fonts.gstatic.com/",
  "object-src 'none'",
];

/**
 * - Cache the files whose URL matches the regex expression @see {@link originCacheExpression}.
 *
 * - Add some headers to improve security
 * {@link https://aws.amazon.com/blogs/networking-and-content-delivery/adding-http-security-headers-using-lambdaedge-and-amazon-cloudfront/}.
 */
export const getLambdaEdgeOriginResponseZipFile = ({
  scp = defaultScp,
}: {
  scp?: string[];
}) => `
exports.handler = (event, context, callback) => {
  const request = event.Records[0].cf.request;
  const response = event.Records[0].cf.response;
  const headers = response.headers;
  
  const maxAge = 150;
  
  headers['cache-control'] = [
    {
      key: 'Cache-Control',
      value: \`max-age=\${maxAge}\`
    }
  ];
  headers['strict-transport-security'] = [
    {
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubdomains; preload'
    }
  ];  
  headers['content-security-policy'] = [
    {
      key: 'Content-Security-Policy',
      value: ${JSON.stringify(scp)}.join('; '),
    },
  ];
  headers['x-content-type-options'] = [
    {
      key: 'X-Content-Type-Options',
      value: 'nosniff'
    }
  ];
  headers['x-frame-options'] = [
    {
      key: 'X-Frame-Options',
      value: 'DENY'
    }
  ];
  headers['x-xss-protection'] = [
    {
      key: 'X-XSS-Protection',
      value: '1; mode=block'
    }
  ];
  headers['referrer-policy'] = [
    {
      key: 'Referrer-Policy',
      value: 'same-origin'
    }
  ];
  
  callback(null, response);
};
`;

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

const getCloudFrontEdgeLambdas = ({
  scp,
  spa,
}: {
  scp?: string[];
  spa?: boolean;
}) => {
  let lambdaEdgeResources: { [key: string]: Resource } = {
    [PUBLISH_LAMBDA_VERSION_ROLE_LOGICAL_ID]: {
      Type: 'AWS::IAM::Role',
      Properties: {
        AssumeRolePolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: ['lambda.amazonaws.com'],
              },
              Action: ['sts:AssumeRole'],
            },
          ],
        },
        Path: `/${NAME}/`,
        Policies: [
          {
            PolicyName: `${PUBLISH_LAMBDA_VERSION_ROLE_LOGICAL_ID}Policy`,
            PolicyDocument: {
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Action: 'lambda:PublishVersion',
                  Resource: '*',
                },
              ],
            },
          },
        ],
      },
    },
    [PUBLISH_LAMBDA_VERSION_LOGICAL_ID]: {
      Type: 'AWS::Lambda::Function',
      Properties: {
        Code: { ZipFile: PUBLISH_LAMBDA_VERSION_ZIP_FILE },
        Description:
          'Custom resource for getting latest version of a lambda, as required by CloudFront.',
        Handler: 'index.handler',
        MemorySize: 128,
        Role: { 'Fn::GetAtt': `${PUBLISH_LAMBDA_VERSION_ROLE_LOGICAL_ID}.Arn` },
        Runtime: 'nodejs12.x',
      },
    },
    [LAMBDA_EDGE_IAM_ROLE_LOGICAL_ID]: {
      Type: 'AWS::IAM::Role',
      Description: 'Lambda Edge IAM Role',
      Properties: {
        AssumeRolePolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Sid: 'AllowLambdaServiceToAssumeRole',
              Effect: 'Allow',
              Principal: {
                Service: ['edgelambda.amazonaws.com', 'lambda.amazonaws.com'],
              },
              Action: ['sts:AssumeRole'],
            },
          ],
        },
        ManagedPolicyArns: [
          'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
        ],
        Path: `/${NAME}/`,
        Policies: [
          {
            PolicyName: 'LambdaEdgeIAMRolePolicyName',
            PolicyDocument: {
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Deny',
                  Action: '*',
                  Resource: '*',
                },
              ],
            },
          },
        ],
      },
    },
    [LAMBDA_EDGE_ORIGIN_RESPONSE_LOGICAL_ID]: {
      Type: 'AWS::Lambda::Function',
      Properties: {
        Code: { ZipFile: getLambdaEdgeOriginResponseZipFile({ scp }) },
        Description: 'Lambda@Edge function serving as origin response.',
        Handler: 'index.handler',
        MemorySize: 128,
        Role: { 'Fn::GetAtt': `${LAMBDA_EDGE_IAM_ROLE_LOGICAL_ID}.Arn` },
        Runtime: 'nodejs12.x',
        Timeout: 5,
      },
    },
    [LAMBDA_EDGE_VERSION_ORIGIN_RESPONSE_LOGICAL_ID]: {
      Type: 'Custom::LatestLambdaVersion',
      Properties: {
        FunctionName: {
          Ref: LAMBDA_EDGE_ORIGIN_RESPONSE_LOGICAL_ID,
        },
        Nonce: `${Date.now()}`,
        ServiceToken: {
          'Fn::GetAtt': `${PUBLISH_LAMBDA_VERSION_LOGICAL_ID}.Arn`,
        },
      },
    },
  };

  /**
   * If not SPA, then add Lambda@Edge viewer request, which handle the received
   * URI and convert to final files to be retrieved from AWS S3.
   */
  if (!spa) {
    lambdaEdgeResources = {
      ...lambdaEdgeResources,
      [LAMBDA_EDGE_VIEWER_REQUEST_LOGICAL_ID]: {
        Type: 'AWS::Lambda::Function',
        Properties: {
          Code: { ZipFile: LAMBDA_EDGE_VIEWER_REQUEST_ZIP_FILE },
          Description: 'Lambda@Edge function serving as viewer request.',
          Handler: 'index.handler',
          MemorySize: 128,
          Role: { 'Fn::GetAtt': `${LAMBDA_EDGE_IAM_ROLE_LOGICAL_ID}.Arn` },
          Runtime: 'nodejs12.x',
          Timeout: 5,
        },
      },
      [LAMBDA_EDGE_VERSION_VIEWER_REQUEST_LOGICAL_ID]: {
        Type: 'Custom::LatestLambdaVersion',
        Properties: {
          FunctionName: {
            Ref: LAMBDA_EDGE_VIEWER_REQUEST_LOGICAL_ID,
          },
          Nonce: `${Date.now()}`,
          ServiceToken: {
            'Fn::GetAtt': `${PUBLISH_LAMBDA_VERSION_LOGICAL_ID}.Arn`,
          },
        },
      },
    };
  }

  return lambdaEdgeResources;
};

const getCloudFrontTemplate = ({
  acmArn,
  aliases,
  cloudfront,
  scp,
  spa,
  hostedZoneName,
  region,
}: {
  acmArn?: string;
  aliases?: string[];
  cloudfront: boolean;
  scp?: string[];
  spa?: boolean;
  hostedZoneName?: string;
  region?: string;
}): CloudFormationTemplate => {
  const template = { ...getBaseTemplate({ cloudfront, spa }) };

  const cloudFrontResources: { [key: string]: Resource } = {
    ...getCloudFrontEdgeLambdas({ scp, spa }),
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
            LambdaFunctionAssociations: [
              /**
               * If SPA, do not add viewer-request.
               */
              ...(spa
                ? []
                : [
                    {
                      EventType: 'viewer-request',
                      LambdaFunctionARN: {
                        'Fn::GetAtt': `${LAMBDA_EDGE_VERSION_VIEWER_REQUEST_LOGICAL_ID}.FunctionArn`,
                      },
                    },
                  ]),
              {
                EventType: 'origin-response',
                LambdaFunctionARN: {
                  'Fn::GetAtt': `${LAMBDA_EDGE_VERSION_ORIGIN_RESPONSE_LOGICAL_ID}.FunctionArn`,
                },
              },
            ],
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
              OriginShield: region
                ? {
                    Enabled: true,
                    OriginShieldRegion: getOriginShieldRegion(region),
                  }
                : undefined,
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

  if (acmArn) {
    /**
     * Add ACM to CloudFront template.
     */
    cloudFrontResources.CloudFrontDistribution.Properties.DistributionConfig = {
      ...cloudFrontResources.CloudFrontDistribution.Properties
        .DistributionConfig,
      Aliases: aliases || { Ref: 'AWS::NoValue' },
      ViewerCertificate: {
        AcmCertificateArn: /^arn:aws:acm:[-a-z0-9]+:\d{12}:certificate\/[-a-z0-9]+$/.test(
          acmArn,
        )
          ? acmArn
          : {
              'Fn::ImportValue': acmArn,
            },
        SslSupportMethod: 'sni-only',
      },
    };
  }

  /**
   * Add aliases to Route 53 records.
   */
  if (hostedZoneName && aliases) {
    const recordSets = aliases.map((alias) => ({
      Name: alias,
      ResourceRecords: [
        {
          'Fn::GetAtt': `${CLOUDFRONT_DISTRIBUTION_LOGICAL_ID}.DomainName`,
        },
      ],
      TTL: `${60 * 60 * 24}`, // 24 hours.
      Type: 'CNAME',
    }));

    const route53RecordSetGroupResources: { [key: string]: Resource } = {
      Route53RecordSetGroup: {
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
  acmArn,
  aliases,
  cloudfront,
  scp,
  spa,
  hostedZoneName,
  region,
}: {
  acmArn?: string;
  aliases?: string[];
  cloudfront?: boolean;
  scp?: string[];
  spa?: boolean;
  hostedZoneName?: string;
  region?: string;
}): CloudFormationTemplate => {
  if (cloudfront) {
    return getCloudFrontTemplate({
      acmArn,
      aliases,
      cloudfront,
      scp,
      spa,
      hostedZoneName,
      region,
    });
  }
  return getBaseTemplate({ cloudfront, spa });
};

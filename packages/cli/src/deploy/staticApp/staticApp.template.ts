/* eslint-disable no-template-curly-in-string */

/**
 * Some implementation idea was taken from here:
 * https://gist.github.com/jed/56b1f58297d374572bc51c59394c7e7f
 */

import { NAME } from '../../config';
import { CloudFormationTemplate, Resource, Output } from '../../utils';

const STATIC_APP_BUCKET_LOGICAL_ID = 'StaticBucket';

const CLOUDFRONT_DISTRIBUTION_ID = 'CloudFrontDistributionId';

const CLOUDFRONT_DISTRIBUTION_ORIGIN_ACCESS_IDENTITY_LOGICAL_ID =
  'CloudFrontDistributionOriginAccessIdentity';

const CLOUDFRONT_DISTRIBUTION_LOGICAL_ID = 'CloudFrontDistribution';

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

const LAMBDA_EDGE_ORIGIN_REQUEST_LOGICAL_ID = 'LambdaEdgeOriginRequest';

const LAMBDA_EDGE_VERSION_ORIGIN_REQUEST_LOGICAL_ID =
  'LambdaEdgeVersionOriginRequest';

const LAMBDA_EDGE_ORIGIN_REQUEST_ZIP_FILE = `
exports.handler = (event, context, callback) => {
  const request = event.Records[0].cf.request;
  const uri = request.uri;

  if (uri.endsWith('/')) {
    request.uri += 'index.html';
  } else if (!uri.includes('.')) {
    request.uri += '.html';
  }

  callback(null, request);
};
`.trim();

const LAMBDA_EDGE_ORIGIN_RESPONSE_LOGICAL_ID = 'LambdaEdgeOriginResponse';

const LAMBDA_EDGE_VERSION_ORIGIN_RESPONSE_LOGICAL_ID =
  'LambdaEdgeVersionOriginResponse';

const getLambdaEdgeOriginResponseZipFile = ({ spa }: { spa: boolean }) =>
  `
exports.handler = (event, context, callback) => {
  const request = event.Records[0].cf.request;
  const response = event.Records[0].cf.response;
  const headers = response.headers; 
  
  headers['cache-control'] = [
    {
      key: 'Cache-Control',
      value: ${
        spa
          ? "'public, max-age=31536000, immutable'"
          : "request.uri.includes('/static/') ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate'"
      }
    }
  ];

  /**
   * https://aws.amazon.com/blogs/networking-and-content-delivery/adding-http-security-headers-using-lambdaedge-and-amazon-cloudfront/
   */
  headers['strict-transport-security'] = [
    {
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubdomains; preload'
    }
  ];
  // headers['content-security-policy'] = [
  //   {
  //     key: 'Content-Security-Policy',
  //     value: [
  //       "default-src 'self'",
  //       "img-src 'self'",
  //       "script-src 'self'",
  //       "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  //       "font-src 'self' https://fonts.gstatic.com",
  //       "object-src 'none'",
  //     ].join('; '),
  //   },
  // ];
  headers['x-content-type-options'] = [{key: 'X-Content-Type-Options', value: 'nosniff'}];
  headers['x-frame-options'] = [{key: 'X-Frame-Options', value: 'DENY'}];
  headers['x-xss-protection'] = [{key: 'X-XSS-Protection', value: '1; mode=block'}];
  headers['referrer-policy'] = [{key: 'Referrer-Policy', value: 'same-origin'}];
  
  callback(null, response);
};
`.trim();

const getBaseTemplate = (): CloudFormationTemplate => {
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
            IndexDocument: 'index.html',
            ErrorDocument: 'index.html',
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
                Principal: '*',
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

const getCloudFrontEdgeLambdas = ({ spa }: { spa: boolean }) => {
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
        Code: { ZipFile: getLambdaEdgeOriginResponseZipFile({ spa }) },
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
   * If not SPA, then add Lambda@Edge origin request, which handle the received
   * URI and convert to final files to be retrieved from AWS S3.
   */
  if (!spa) {
    lambdaEdgeResources = {
      ...lambdaEdgeResources,
      [LAMBDA_EDGE_ORIGIN_REQUEST_LOGICAL_ID]: {
        Type: 'AWS::Lambda::Function',
        Properties: {
          Code: { ZipFile: LAMBDA_EDGE_ORIGIN_REQUEST_ZIP_FILE },
          Description: 'Lambda@Edge function serving as origin request.',
          Handler: 'index.handler',
          MemorySize: 128,
          Role: { 'Fn::GetAtt': `${LAMBDA_EDGE_IAM_ROLE_LOGICAL_ID}.Arn` },
          Runtime: 'nodejs12.x',
          Timeout: 5,
        },
      },
      [LAMBDA_EDGE_VERSION_ORIGIN_REQUEST_LOGICAL_ID]: {
        Type: 'Custom::LatestLambdaVersion',
        Properties: {
          FunctionName: {
            Ref: LAMBDA_EDGE_ORIGIN_REQUEST_LOGICAL_ID,
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
  acmArnExportedName,
  aliases,
  spa = false,
  hostedZoneName,
}: {
  acmArn?: string;
  acmArnExportedName?: string;
  aliases?: string[];
  spa?: boolean;
  hostedZoneName?: string;
}): CloudFormationTemplate => {
  const template = { ...getBaseTemplate() };

  const cloudFrontResources: { [key: string]: Resource } = {
    ...getCloudFrontEdgeLambdas({ spa }),
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
             * https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-web-values-specify.html#DownloadDistValuesDefaultTTL
             */
            DefaultTTL: 60 * 60 * 24 * 365, // one year
            ForwardedValues: {
              QueryString: true,
            },
            LambdaFunctionAssociations: [
              /**
               * If SPA, do not add origin-request.
               */
              ...(spa
                ? []
                : [
                    {
                      EventType: 'origin-request',
                      LambdaFunctionARN: {
                        'Fn::GetAtt': `${LAMBDA_EDGE_VERSION_ORIGIN_REQUEST_LOGICAL_ID}.FunctionArn`,
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
              DomainName: {
                'Fn::GetAtt': `${STATIC_APP_BUCKET_LOGICAL_ID}.DomainName`,
              },
              Id: { Ref: STATIC_APP_BUCKET_LOGICAL_ID },
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

  if (acmArn || acmArnExportedName) {
    /**
     * Add ACM to CloudFront template.
     */
    cloudFrontResources.CloudFrontDistribution.Properties.DistributionConfig = {
      ...cloudFrontResources.CloudFrontDistribution.Properties
        .DistributionConfig,
      Aliases: aliases || { Ref: 'AWS::NoValue' },
      ViewerCertificate: {
        AcmCertificateArn: acmArn || {
          'Fn::ImportValue': acmArnExportedName,
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
      TTL: `${60 * 60 * 12}`, // 12 hours.
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
  };

  return template;
};

export const getStaticAppTemplate = ({
  acmArn,
  acmArnExportedName,
  aliases,
  cloudfront,
  spa,
  hostedZoneName,
}: {
  acmArn?: string;
  acmArnExportedName?: string;
  aliases?: string[];
  cloudfront: boolean;
  spa: boolean;
  hostedZoneName?: string;
}): CloudFormationTemplate => {
  if (cloudfront) {
    return getCloudFrontTemplate({
      acmArn,
      acmArnExportedName,
      aliases,
      spa,
      hostedZoneName,
    });
  }
  return getBaseTemplate();
};

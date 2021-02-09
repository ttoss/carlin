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

const LAMBDA_EDGE_VIEWER_REQUEST_LOGICAL_ID = 'LambdaEdgeViewerRequest';

const LAMBDA_EDGE_VERSION_VIEWER_REQUEST_LOGICAL_ID =
  'LambdaEdgeVersionViewerRequest';

const LAMBDA_EDGE_VIEWER_REQUEST_ZIP_FILE = `
'use strict';
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

export type CSP = { [key: string]: string | string[] };

/**
 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy
 */
const getDefaultCsp = (): CSP => ({
  'default-src': "'self'",
  /**
   * Fetch APIs, only if start with HTTPS.
   */
  'connect-src': "'self' https:",
  /**
   * 'script-src' and 'img-src' must have 'self' default because when
   * Lambda@Edge will append these policies, these values will have values and
   * it won't have 'self'. This what self scripts and images won't work.
   * Issue #17 https://github.com/ttoss/carlin/issues/17.
   */
  'script-src': "'self'",
  'img-src': "'self'",
  /**
   * 'unsafe-inline' is needed to load components library.
   */
  'style-src': "'self' 'unsafe-inline' https://fonts.googleapis.com/",
  'font-src': "'self' https://fonts.gstatic.com/",
  'object-src': "'none'",
});

const updateCspObject = ({ csp, currentCsp }: { csp: CSP; currentCsp: CSP }) =>
  Object.entries(csp).reduce(
    (acc, [key, value]) => {
      if (Array.isArray(value)) {
        const [cspValue, operation] = value;
        if (operation === 'replace') {
          acc[key] = cspValue;
        } else {
          acc[key] = `${acc[key]} ${cspValue}`;
        }
      } else if (acc[key]) {
        acc[key] = `${acc[key]} ${value}`;
      } else {
        acc[key] = value;
      }
      return acc;
    },
    { ...currentCsp },
  );

/**
 * Generate CSP string from object.
 */
export const generateCspString = ({
  csp = getDefaultCsp(),
}: { csp?: CSP } = {}) => {
  return (
    Object.entries(csp)
      /**
       * Yargs transform kebab-case to camelCase. Then return only keys that
       * end with '-src' {@link https://github.com/ttoss/carlin/issues/11}
       */
      .filter(([key]) => key.endsWith('-src'))
      .map(([key, value]) => `${key} ${value}`)
      .join('; ')
  );
};

const assignHeaders = ({ csp }: { csp?: CSP }) => {
  return `
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
      value: "${generateCspString({ csp })}"
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
  `;
};

const LAMBDA_EDGE_ORIGIN_REQUEST_LOGICAL_ID = 'LambdaEdgeOriginRequest';

const LAMBDA_EDGE_VERSION_ORIGIN_REQUEST_LOGICAL_ID =
  'LambdaEdgeVersionOriginRequest';

/**
 * Created to allow Google Marketing Platform though Google Tag Manager.
 * {@link https://github.com/ttoss/carlin/issues/3}
 *
 * It's not possible to change body from S3 origin thought Lambda@Edge. The
 * implementation was made considering this questions and responses.
 * - {@link https://stackoverflow.com/questions/62893845/how-can-i-modify-a-pages-html-with-aws-cloudfront-running-a-lambdaedge-functio}
 * - {@link https://stackoverflow.com/questions/51230768/aws-lambdaedge-how-to-read-html-file-from-s3-and-put-content-in-response-body}
 *
 * When this Lambda@Edge is created, origin response is not created because
 * this function make a GET request to S3 and return the body.
 */
const getLambdaEdgeOriginRequestZipFile = ({
  gtmId,
  region,
  csp,
}: {
  gtmId: string;
  region: string;
  csp?: CSP;
}) => {
  /**
   * Add CSP to allow Google Marketing Platform words.
   * {@link https://developers.google.com/tag-manager/web/csp}
   */
  const fullCsp = [
    getDefaultCsp(),
    /**
     * https://developers.google.com/tag-manager/web/csp#enabling_the_google_tag_manager_snippet
     */
    {
      'img-src': 'www.googletagmanager.com',
    },
    /**
     * https://developers.google.com/tag-manager/web/csp#preview_mode
     */
    {
      'script-src': 'https://tagmanager.google.com',
      'style-src': 'https://tagmanager.google.com https://fonts.googleapis.com',
      'img-src':
        'https://ssl.gstatic.com https://www.gstatic.com https://fonts.gstatic.com data:',
      'font-src': 'data:',
    },
    /**
     * https://developers.google.com/tag-manager/web/csp#universal_analytics_google_analytics
     */
    {
      'script-src':
        'https://www.google-analytics.com https://ssl.google-analytics.com',
      'img-src': 'https://www.google-analytics.com',
      'connect-src': 'https://www.google-analytics.com',
    },
    /**
     * https://developers.google.com/tag-manager/web/csp#google_optimize
     */
    {
      'script-src': 'https://www.google-analytics.com',
    },
    /**
     * https://developers.google.com/tag-manager/web/csp#google_ads_conversions
     */
    {
      'script-src': 'https://www.googleadservices.com https://www.google.com',
      'img-src': 'https://googleads.g.doubleclick.net https://www.google.com',
    },
    /**
     * https://developers.google.com/tag-manager/web/csp#google_ads_remarketing
     */
    {
      'script-src':
        'https://www.googleadservices.com https://googleads.g.doubleclick.net https://www.google.com',
      'img-src': 'https://www.google.com',
      'frame-src': 'https://bid.g.doubleclick.net',
    },
  ].reduce(
    (acc, curCsp) => updateCspObject({ csp: curCsp, currentCsp: acc }),
    csp || {},
  );

  return `
'use strict';

const { S3 } = require('aws-sdk');
const crypto = require('crypto');

const s3 = new S3({ region: "${region}" });

const nonce = crypto.randomBytes(16).toString('base64');

// https://developers.google.com/tag-manager/web/csp
const gtmScript = \`
<script nonce="\${nonce}">(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;var n=d.querySelector('[nonce]');
n&&j.setAttribute('nonce',n.nonce||n.getAttribute('nonce'));f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');</script>
\`.replace(/\\n/g, '');

exports.handler = async (event, context) => {
  const request = { ...event.Records[0].cf.request };

  if (!request.uri.endsWith(".html")) {
    return request;
  }

  const { origin } = request;

  const bucket = origin.s3.domainName.split(".")[0];

  const key = origin.s3.path.replace(new RegExp("^/"), '') + request.uri;

  const {
    Body,
    ContentType
  } = await s3.getObject({
    Bucket: bucket,
    Key: key,
  }).promise();

  let headers = { };
  
  headers["content-type"] = [
    {
      key: "Content-Type",
      value: ContentType
    }
  ];  

  ${assignHeaders({ csp: fullCsp })}

  const cspValue = headers['content-security-policy'][0].value.replace("script-src", \`script-src 'nonce-\${nonce}'\`);

  headers['content-security-policy'][0].value = cspValue;

  const body = Body.toString().replace("</head>", gtmScript + "</head>");
  
  const response = {
    status: "200",
    statusDescription: "Ok",
    headers,
    body
  };

  return response;
};
`.trim();
};

const LAMBDA_EDGE_ORIGIN_RESPONSE_LOGICAL_ID = 'LambdaEdgeOriginResponse';

const LAMBDA_EDGE_VERSION_ORIGIN_RESPONSE_LOGICAL_ID =
  'LambdaEdgeVersionOriginResponse';

/**
 * This method is only triggered if origin request is not created, because
 * origin request return a "body".
 *
 * Add some headers to improve security
 * {@link https://aws.amazon.com/blogs/networking-and-content-delivery/adding-http-security-headers-using-lambdaedge-and-amazon-cloudfront/}.
 */
export const getLambdaEdgeOriginResponseZipFile = ({
  csp = {},
}: { csp?: CSP } = {}) => {
  return `
'use strict';
exports.handler = (event, context, callback) => {
  const request = event.Records[0].cf.request;
  const response = event.Records[0].cf.response;
  const headers = response.headers;
  
  ${assignHeaders({
    csp: updateCspObject({ csp, currentCsp: getDefaultCsp() }),
  })}
  
  callback(null, response);
};
`.trim();
};

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
  gtmId,
  region,
  csp,
  spa,
}: {
  gtmId?: string;
  region: string;
  csp?: CSP;
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
                  Effect: 'Allow',
                  Action: 's3:GetObject',
                  Resource: {
                    'Fn::Join': [
                      '',
                      [
                        {
                          'Fn::GetAtt': [STATIC_APP_BUCKET_LOGICAL_ID, 'Arn'],
                        },
                        '/*',
                      ],
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    ...(gtmId && {
      [LAMBDA_EDGE_ORIGIN_REQUEST_LOGICAL_ID]: {
        Type: 'AWS::Lambda::Function',
        Properties: {
          Code: {
            ZipFile: getLambdaEdgeOriginRequestZipFile({ gtmId, csp, region }),
          },
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
    }),
    [LAMBDA_EDGE_ORIGIN_RESPONSE_LOGICAL_ID]: {
      Type: 'AWS::Lambda::Function',
      Properties: {
        Code: { ZipFile: getLambdaEdgeOriginResponseZipFile({ csp }) },
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
  acm,
  aliases,
  cloudfront,
  gtmId,
  csp,
  spa,
  hostedZoneName,
  region,
}: {
  acm?: string;
  aliases?: string[];
  cloudfront: boolean;
  gtmId?: string;
  csp?: CSP;
  spa?: boolean;
  hostedZoneName?: string;
  region: string;
}): CloudFormationTemplate => {
  const template = { ...getBaseTemplate({ cloudfront, spa }) };

  const cloudFrontEdgeLambdas = getCloudFrontEdgeLambdas({
    gtmId,
    region,
    csp,
    spa,
  });

  const cloudFrontResources: { [key: string]: Resource } = {
    ...cloudFrontEdgeLambdas,
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
              ...(cloudFrontEdgeLambdas[LAMBDA_EDGE_VIEWER_REQUEST_LOGICAL_ID]
                ? [
                    {
                      EventType: 'viewer-request',
                      LambdaFunctionARN: {
                        'Fn::GetAtt': `${LAMBDA_EDGE_VERSION_VIEWER_REQUEST_LOGICAL_ID}.FunctionArn`,
                      },
                    },
                  ]
                : []),
              ...(cloudFrontEdgeLambdas[LAMBDA_EDGE_ORIGIN_REQUEST_LOGICAL_ID]
                ? [
                    {
                      EventType: 'origin-request',
                      LambdaFunctionARN: {
                        'Fn::GetAtt': `${LAMBDA_EDGE_VERSION_ORIGIN_REQUEST_LOGICAL_ID}.FunctionArn`,
                      },
                    },
                  ]
                : []),
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
    /**
     * Add ACM to CloudFront template.
     */
    cloudFrontResources.CloudFrontDistribution.Properties.DistributionConfig = {
      ...cloudFrontResources.CloudFrontDistribution.Properties
        .DistributionConfig,
      Aliases: aliases || { Ref: 'AWS::NoValue' },
      ViewerCertificate: {
        AcmCertificateArn: /^arn:aws:acm:[-a-z0-9]+:\d{12}:certificate\/[-a-z0-9]+$/.test(
          acm,
        )
          ? acm
          : {
              'Fn::ImportValue': acm,
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
  acm,
  aliases,
  cloudfront,
  gtmId,
  csp,
  spa,
  hostedZoneName,
  region,
}: {
  acm?: string;
  aliases?: string[];
  cloudfront?: boolean;
  gtmId?: string;
  csp?: CSP;
  spa?: boolean;
  hostedZoneName?: string;
  region: string;
}): CloudFormationTemplate => {
  if (cloudfront) {
    return getCloudFrontTemplate({
      acm,
      aliases,
      cloudfront,
      gtmId,
      csp,
      spa,
      hostedZoneName,
      region,
    });
  }
  return getBaseTemplate({ cloudfront, spa });
};

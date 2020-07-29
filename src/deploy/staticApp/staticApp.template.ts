import type {
  CloudFormationTemplate,
  Environment,
  Resource,
} from '../../utils';

const STATIC_APP_BUCKET_LOGICAL_ID = 'StaticBucket';

const CLOUDFRONT_DISTRIBUTION_ID = 'CloudFrontDistributionId';

export const getStaticAppTemplate = ({
  acmArnExportedName,
  environment,
  staticAppAliases,
  staticAppEdge,
}: {
  acmArnExportedName?: string;
  environment: Environment;
  staticAppAliases?: string[];
  staticAppEdge: boolean;
}): CloudFormationTemplate => {
  const CLOUDFRONT_DISTRIBUTION_ORIGIN_ACCESS_IDENTITY_LOGICAL_ID =
    'CloudFrontDistributionOriginAccessIdentity';

  const template: CloudFormationTemplate = {
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

  if (['Production', 'Staging', 'Development'].includes(environment)) {
    const CLOUDFRONT_DISTRIBUTION_LOGICAL_ID = 'CloudFrontDistribution';

    const LAMBDA_EDGE_ORIGIN_REQUEST_LOGICAL_ID = 'LambdaEdgeOriginRequest';

    const LAMBDA_EDGE_VERSION_ORIGIN_REQUEST_LOGICAL_ID =
      'LambdaEdgeVersionOriginRequest';

    const LAMBDA_EDGE_ORIGIN_RESPONSE_LOGICAL_ID = 'LambdaEdgeOriginResponse';

    const LAMBDA_EDGE_VERSION_ORIGIN_RESPONSE_LOGICAL_ID =
      'LambdaEdgeVersionOriginResponse';

    /**
     * Add Lambda@Edge resources to template.
     */
    if (staticAppEdge) {
      const LAMBDA_EDGE_IAM_ROLE_LOGICAL_ID = 'LambdaEdgeIAMRole';

      const lambdaEdgeResources: { [key: string]: Resource } = {
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
                    Service: [
                      'edgelambda.amazonaws.com',
                      'lambda.amazonaws.com',
                    ],
                  },
                  Action: ['sts:AssumeRole'],
                },
              ],
            },
            Path: '/custom-iam/project-role/',
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
        [LAMBDA_EDGE_ORIGIN_REQUEST_LOGICAL_ID]: {
          Type: 'AWS::Lambda::Function',
          Properties: {
            Code: {
              ZipFile: `
                exports.handler = (event, context, callback) => {
                  const request = event.Records[0].cf.request;
                  const uri = request.uri;

                  if (uri.endsWith('/')) {
                    request.uri += 'index.html';
                  } else if (!uri.includes('.')) {
                    request.uri += '/index.html';
                  }

                  callback(null, request);
                };
              `,
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
          Type: 'AWS::Lambda::Version',
          Properties: {
            FunctionName: {
              'Fn::GetAtt': `${LAMBDA_EDGE_ORIGIN_REQUEST_LOGICAL_ID}.Arn`,
            },
          },
        },
        [LAMBDA_EDGE_ORIGIN_RESPONSE_LOGICAL_ID]: {
          Type: 'AWS::Lambda::Function',
          Properties: {
            Code: {
              ZipFile: `
                exports.handler = (event, context, callback) => {
                  const request = event.Records[0].cf.request;
                  const response = event.Records[0].cf.response;
                  const headers = response.headers;

                  if (request.uri.startsWith('/static/')) {
                    headers['cache-control'] = [
                      {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable'
                      }
                    ];
                  } else {
                    headers['cache-control'] = [
                      {
                        key: 'Cache-Control',
                        value: 'public, max-age=0, must-revalidate'
                      }
                    ];
                  }

                  // [
                  //   {
                  //     key: 'Strict-Transport-Security',
                  //     value: 'max-age=31536000'
                  //   },
                  //   {
                  //     key: 'X-Content-Type-Options',
                  //     value: 'nosniff'
                  //   },
                  //   {
                  //     key: 'X-Permitted-Cross-Domain-Policies',
                  //     value: 'none'
                  //   },
                  //   {
                  //     key: 'Referrer-Policy',
                  //     value: 'no-referrer'
                  //   },
                  //   {
                  //     key: 'X-Frame-Options',
                  //     value: 'deny'
                  //   },
                  //   {
                  //     key: 'X-XSS-Protection',
                  //     value: '1; mode=block'
                  //   },
                  //   {
                  //     key: 'Content-Security-Policy',
                  //     value:
                  //       "default-src 'none' ; script-src 'self' 'unsafe-inline'; " +
                  //       "style-src 'self' 'unsafe-inline' ; img-src 'self' data:; " +
                  //       "font-src 'self' ; manifest-src 'self' ; " +
                  //       'upgrade-insecure-requests; block-all-mixed-content;'
                  //   }
                  // ].forEach(h => (headers[h.key.toLowerCase()] = [h]));

                  callback(null, response);
                };
              `,
            },
            Description: 'Lambda@Edge function serving as origin response.',
            Handler: 'index.handler',
            MemorySize: 128,
            Role: { 'Fn::GetAtt': `${LAMBDA_EDGE_IAM_ROLE_LOGICAL_ID}.Arn` },
            Runtime: 'nodejs12.x',
            Timeout: 5,
          },
        },
        [LAMBDA_EDGE_VERSION_ORIGIN_RESPONSE_LOGICAL_ID]: {
          Type: 'AWS::Lambda::Version',
          Properties: {
            FunctionName: {
              'Fn::GetAtt': `${LAMBDA_EDGE_ORIGIN_RESPONSE_LOGICAL_ID}.Arn`,
            },
          },
        },
      };

      template.Resources = { ...template.Resources, ...lambdaEdgeResources };
    }

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
              if (staticAppEdge) {
                return {
                  ErrorCachingMinTTL: 0,
                  ErrorCode: errorCode,
                  ResponseCode: 404,
                  ResponsePagePath: '/404.html',
                };
              }

              return {
                ErrorCachingMinTTL: 60 * 60 * 24,
                ErrorCode: errorCode,
                ResponseCode: 200,
                ResponsePagePath: '/index.html',
              };
            }),
            DefaultCacheBehavior: {
              AllowedMethods: ['GET', 'HEAD', 'OPTIONS'],
              Compress: true,
              DefaultTTL: 60 * 60 * 24 * 365, // one year
              ForwardedValues: {
                QueryString: false,
                Cookies: {
                  Forward: 'none',
                },
              },
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
            PriceClass: 'PriceClass_100',
            // "Restrictions" : Restrictions,
            // "WebACLId" : String
          },
        },
      },
    };

    /**
     * Add Lambda@Edge to CloudFront Distribution DefaultCacheBehavior.
     */
    if (staticAppEdge) {
      cloudFrontResources[CLOUDFRONT_DISTRIBUTION_LOGICAL_ID].DependsOn = [
        LAMBDA_EDGE_ORIGIN_REQUEST_LOGICAL_ID,
        LAMBDA_EDGE_VERSION_ORIGIN_REQUEST_LOGICAL_ID,
        LAMBDA_EDGE_ORIGIN_RESPONSE_LOGICAL_ID,
        LAMBDA_EDGE_VERSION_ORIGIN_RESPONSE_LOGICAL_ID,
      ];

      cloudFrontResources[
        CLOUDFRONT_DISTRIBUTION_LOGICAL_ID
      ].Properties.DistributionConfig.DefaultCacheBehavior.LambdaFunctionAssociations = [
        {
          EventType: 'origin-request',
          LambdaFunctionARN: {
            Ref: LAMBDA_EDGE_VERSION_ORIGIN_REQUEST_LOGICAL_ID,
          },
        },
        {
          EventType: 'origin-response',
          LambdaFunctionARN: {
            Ref: LAMBDA_EDGE_VERSION_ORIGIN_RESPONSE_LOGICAL_ID,
          },
        },
      ];
    }

    // if (staticAppAliases) {
    //   const aliases = staticAppAliases.map((alias) => {
    //     if (environment === 'Production') {
    //       return alias;
    //     }

    //     const notProductionUrl = `${alias.replace(
    //       /\./g,
    //       '-'
    //     )}.${CLOUD_DOMAIN_NAME}`;

    //     if (environment === ENVIRONMENTS.Staging) {
    //       return notProductionUrl;
    //     }

    //     /**
    //      * Environment is Development.
    //      */
    //     return `dev-${notProductionUrl}`;
    //   });

    //   const getAcmCertificateArn = () => {
    //     if (environment === ENVIRONMENTS.Production && !acmArnExportedName) {
    //       throw new Error(
    //         'On Production environment, when staticAppAliases has values, staticAppProductionAcmArnExportName must have the ACM ARN exported name.'
    //       );
    //     }

    //     const importValue =
    //       environment === ENVIRONMENTS.Production
    //         ? acmArnExportedName
    //         : CLOUD_DOMAIN_ACM_EXPORTED_ARN;

    //     return {
    //       'Fn::ImportValue': importValue,
    //     };
    //   };

    //   /**
    //    * Add ACM to CloudFront template.
    //    */
    //   cloudFrontResources.CloudFrontDistribution.Properties.DistributionConfig = {
    //     ...cloudFrontResources.CloudFrontDistribution.Properties
    //       .DistributionConfig,
    //     Aliases: aliases,
    //     ViewerCertificate: {
    //       AcmCertificateArn: getAcmCertificateArn(),
    //       SslSupportMethod: 'sni-only',
    //     },
    //   };

    //   const aliasesOutput = aliases.reduce<{ [key: string]: Output }>(
    //     (acc, alias, index) => ({
    //       ...acc,
    //       [`Alias${index}URL`]: {
    //         Value: `https://${alias}`,
    //       },
    //     }),
    //     {}
    //   );

    //   /**
    //    * Add aliases output to template.
    //    */
    //   template.Outputs = { ...template.Outputs, ...aliasesOutput };

    //   /**
    //    * Add aliases to Route 53 records.
    //    */
    //   if (
    //     [ENVIRONMENTS.Staging, ENVIRONMENTS.Development].includes(environment)
    //   ) {
    //     const recordSets = aliases.map((alias) => ({
    //       Name: alias,
    //       ResourceRecords: [
    //         {
    //           'Fn::GetAtt': `${CLOUDFRONT_DISTRIBUTION_LOGICAL_ID}.DomainName`,
    //         },
    //       ],
    //       // 12 hours.
    //       TTL: `${60 * 60 * 12}`,
    //       Type: 'CNAME',
    //     }));

    //     const route53RecordSetGroupResources: { [key: string]: Resource } = {
    //       Route53RecordSetGroup: {
    //         Type: 'AWS::Route53::RecordSetGroup',
    //         DependsOn: [CLOUDFRONT_DISTRIBUTION_LOGICAL_ID],
    //         Properties: {
    //           // https://forums.aws.amazon.com/thread.jspa?threadID=103919
    //           HostedZoneName: `${CLOUD_DOMAIN_NAME}.`,
    //           RecordSets: recordSets,
    //         },
    //       },
    //     };

    //     template.Resources = {
    //       ...template.Resources,
    //       ...route53RecordSetGroupResources,
    //     };
    //   }
    // }

    template.Resources = { ...template.Resources, ...cloudFrontResources };

    /**
     * Add CloudFront Distribution ID and CloudFront URL to template.
     */
    template.Outputs = {
      ...template.Outputs,
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
  }

  return template;
};

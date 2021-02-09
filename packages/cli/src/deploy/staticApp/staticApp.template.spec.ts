/* eslint-disable import/first */

import * as faker from 'faker';

/**
 * Mock to snapshots don't fail.
 */
Date.now = jest.fn(() => 1487076708000);
const PACKAGE_VERSION = '10.40.23';

jest.mock('../../utils', () => ({
  getPackageVersion: jest.fn().mockReturnValue(PACKAGE_VERSION),
}));

const mockS3GetObjectPromise = jest.fn().mockResolvedValue({
  Body: '<html><head></head><body></body></html>',
});

/**
 * Mocked to test Lambda@Edge origin request.
 */
jest.mock('aws-sdk', () => ({
  S3: jest.fn(() => ({
    getObject: jest.fn().mockReturnValue({
      promise: mockS3GetObjectPromise,
    }),
  })),
}));

/**
 * Test nonce value
 */
const nonce = faker.random.alphaNumeric(10);

const cryptoRandomBytesToString = jest.fn().mockReturnValue(nonce);

const cryptoRandomBytes = jest.fn().mockReturnValue({
  toString: cryptoRandomBytesToString,
});

jest.mock('crypto', () => ({
  randomBytes: cryptoRandomBytes,
}));

import {
  getStaticAppTemplate,
  generateCspString,
  getLambdaEdgeOriginResponseZipFile,
  getLambdaEdgeOriginRequestZipFile,
  CLOUDFRONT_DISTRIBUTION_LOGICAL_ID,
} from './staticApp.template';

const defaultCspString =
  "default-src 'self'; connect-src 'self' https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com/; font-src 'self' https://fonts.gstatic.com/; object-src 'none'";

describe('testing getLambdaEdgeOriginRequestZipFile', () => {
  const gtmId = faker.random.word();
  const region = faker.random.word();
  const bucketName = faker.random.word();
  const s3Path = faker.random.word();
  const uri = `${faker.random.word()}.html`;

  const handler = (event: any = {}, csp: any = {}) =>
    // eslint-disable-next-line no-eval
    eval(getLambdaEdgeOriginRequestZipFile({ gtmId, region, csp }))(event);

  const record = {
    cf: {
      config: {
        distributionDomainName: 'd111111abcdef8.cloudfront.net',
        distributionId: 'EDFDVBD6EXAMPLE',
        eventType: 'onlyorigin-request',
        requestId: '4TyzHTaYWb1GX1qTfsHhEqV6HUDd_BzoBZnwfnvQc_1oF26ClkoUSEQ==',
      },
      request: {
        clientIp: '203.0.113.178',
        headers: {
          'x-forwarded-for': [
            {
              key: 'X-Forwarded-For',
              value: '203.0.113.178',
            },
          ],
          'user-agent': [
            {
              key: 'User-Agent',
              value: 'Amazon CloudFront',
            },
          ],
          via: [
            {
              key: 'Via',
              value:
                '2.0 2afae0d44e2540f472c0635ab62c232b.cloudfront.net (CloudFront)',
            },
          ],
          host: [
            {
              key: 'Host',
              value: 'example.org',
            },
          ],
          'cache-control': [
            {
              key: 'Cache-Control',
              value: 'no-cache, cf-no-cache',
            },
          ],
        },
        method: 'GET',
        origin: {
          s3: {
            domainName: `${bucketName}.${faker.random.word()}`,
            path: `/${s3Path}`,
          },
          custom: {
            customHeaders: {},
            domainName: 'example.org',
            keepaliveTimeout: 5,
            path: '',
            port: 443,
            protocol: 'https',
            readTimeout: 30,
            sslProtocols: ['TLSv1', 'TLSv1.1', 'TLSv1.2'],
          },
        },
        querystring: '',
        uri,
      },
    },
  };

  const event = { Records: [record] };

  test('return request if uri is not an HTML', async () => {
    const newRecord = JSON.parse(JSON.stringify(record));
    const newUri = '/';
    newRecord.cf.request.uri = newUri;
    const response = await handler({ Records: [newRecord] });
    expect(response).toEqual(newRecord.cf.request);
  });

  test('return body undefined if not find S3 object', async () => {
    mockS3GetObjectPromise.mockRejectedValueOnce(new Error());
    const response = await handler(event);
    expect(response.body).toBeUndefined();
  });

  test('should call crypto properly', async () => {
    await handler(event);
    expect(cryptoRandomBytesToString).toHaveBeenCalledWith('base64');
    expect(cryptoRandomBytes).toHaveBeenLastCalledWith(16);
  });

  test('return response if uri is an HTML', async () => {
    const response = await handler(event);
    expect(response.status).toEqual('200');
    expect(response.body).toEqual(
      `<html><head><script nonce="${nonce}">(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;var n=d.querySelector('[nonce]');n&&j.setAttribute('nonce',n.nonce||n.getAttribute('nonce'));f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');</script></head><body><noscript><iframe nonce='${nonce}' src='https://www.googletagmanager.com/ns.html?id=${gtmId}' height='0' width='0' style='display:none;visibility:hidden'></iframe></noscript></body></html>`,
    );
    expect(response.headers).toMatchObject(
      expect.objectContaining({
        'cache-control': [{ key: 'Cache-Control', value: 'max-age=30' }],
        'content-type': [{ key: 'Content-Type', value: undefined }],
        'referrer-policy': [{ key: 'Referrer-Policy', value: 'same-origin' }],
        'strict-transport-security': [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubdomains; preload',
          },
        ],
        'x-content-type-options': [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
        'x-frame-options': [{ key: 'X-Frame-Options', value: 'DENY' }],
        'x-xss-protection': [
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      }),
    );
    expect(response.headers['content-security-policy'][0].key).toEqual(
      'Content-Security-Policy',
    );
    expect(response.headers['content-security-policy'][0].value).toEqual(
      `default-src 'self'; connect-src 'self' https: https://www.google-analytics.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com/ https://tagmanager.google.com https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com/ data:; object-src 'none'; script-src 'nonce-${nonce}' 'self' https://tagmanager.google.com https://www.google-analytics.com https://ssl.google-analytics.com https://www.google-analytics.com https://www.googleadservices.com https://www.google.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://www.google.com; img-src 'self' www.googletagmanager.com https://ssl.gstatic.com https://www.gstatic.com https://fonts.gstatic.com data: https://www.google-analytics.com https://googleads.g.doubleclick.net https://www.google.com https://www.google.com; frame-src 'nonce-${nonce}' 'self' https://bid.g.doubleclick.net`,
    );
  });

  describe('return CSP properly if not default', () => {
    const defaultSrc = faker.random.words(5);

    test('without replace', async () => {
      const response = await handler(event, { 'default-src': defaultSrc });
      expect(response.headers['content-security-policy'][0].value).toContain(
        `default-src 'self' ${defaultSrc};`,
      );
    });

    test('with replace', async () => {
      const response = await handler(event, {
        'default-src': [defaultSrc, 'replace'],
      });
      expect(response.headers['content-security-policy'][0].value).toContain(
        `default-src ${defaultSrc};`,
      );
    });
  });
});

describe("fix issue 'Filter CSP directives' #11 https://github.com/ttoss/carlin/issues/11", () => {
  test('generate default CSP', () => {
    const generated = generateCspString({
      csp: {
        directiveSrc: 'some text',
        'directive-src': 'some text',
      },
    });
    expect(generated).not.toContain('directiveSrc');
    expect(generated).toContain('directive-src');
  });
});

describe("fix issue 'Add default CSP to Lambda@Edge origin response' #10 https://github.com/ttoss/carlin/issues/10", () => {
  test('should add csp to Lambda@Edge Origin response', () => {
    expect(getLambdaEdgeOriginResponseZipFile({ csp: {} })).toContain(
      `value: "${defaultCspString}"`,
    );
  });

  test('should add csp to Lambda@Edge Origin response when a directive is passed', () => {
    const code = getLambdaEdgeOriginResponseZipFile({
      csp: { 'new-directive-src': "'some text'" },
    });

    defaultCspString.split('; ').forEach((csp) => expect(code).toContain(csp));

    expect(code).toContain("new-directive-src 'some text'");
  });
});

describe("fix issue 'Add Google Marketing Platform to CSP' #3 https://github.com/ttoss/carlin/issues/3", () => {
  test('generate default CSP', () => {
    expect(generateCspString()).toEqual(defaultCspString);
  });

  test('add new directive', () => {
    expect(
      generateCspString({ csp: { 'new-directive-src': "'some text'" } }),
    ).toContain("new-directive-src 'some text'");
  });

  test('append directive', () => {
    const expected = /default-src .*'some text'/;
    expect(
      generateCspString({ csp: { 'default-src': "'some text'" } }),
    ).toMatch(expected);
    expect(
      generateCspString({ csp: { 'default-src': ["'some text'"] } }),
    ).toMatch(expected);
  });

  test('replace directive', () => {
    expect(
      generateCspString({ csp: { 'default-src': ["'some text'", 'replace'] } }),
    ).toContain("default-src 'some text'");
  });

  test('should add csp to Lambda@Edge Origin response', () => {
    expect(getLambdaEdgeOriginResponseZipFile()).toContain(
      `value: "${defaultCspString}"`,
    );
  });
});

describe("fix issue 'PWA doesn't redirect correctly when browser URL has a path' #1 https://github.com/ttoss/carlin/issues/1", () => {
  test('cloudfront', () => {
    expect(
      getStaticAppTemplate({ cloudfront: true, region: 'us-east-1' }).Resources[
        CLOUDFRONT_DISTRIBUTION_LOGICAL_ID
      ].Properties.DistributionConfig.Origins[0].OriginPath,
    ).toEqual(`/${PACKAGE_VERSION}`);
  });

  test('cloudfront CustomErrorResponses, spa=false', () => {
    expect(
      getStaticAppTemplate({
        cloudfront: true,
        spa: false,
        region: 'us-east-1',
      }).Resources[CLOUDFRONT_DISTRIBUTION_LOGICAL_ID].Properties
        .DistributionConfig.CustomErrorResponses,
    ).toEqual([
      expect.objectContaining({
        ErrorCode: 403,
        ResponseCode: 404,
        ResponsePagePath: `/404.html`,
      }),
      expect.objectContaining({
        ErrorCode: 404,
        ResponseCode: 404,
        ResponsePagePath: `/404.html`,
      }),
    ]);
  });

  test('cloudfront CustomErrorResponses, spa=true', () => {
    expect(
      getStaticAppTemplate({ cloudfront: true, spa: true, region: 'us-east-1' })
        .Resources[CLOUDFRONT_DISTRIBUTION_LOGICAL_ID].Properties
        .DistributionConfig.CustomErrorResponses,
    ).toEqual([
      expect.objectContaining({
        ErrorCode: 403,
        ResponseCode: 200,
        ResponsePagePath: `/index.html`,
      }),
      expect.objectContaining({
        ErrorCode: 404,
        ResponseCode: 200,
        ResponsePagePath: `/index.html`,
      }),
    ]);
  });
});

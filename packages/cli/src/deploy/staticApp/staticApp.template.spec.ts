/* eslint-disable import/first */

/**
 * Mock to snapshots don't fail.
 */
Date.now = jest.fn(() => 1487076708000);
const PACKAGE_VERSION = '10.40.23';

jest.mock('../../utils', () => ({
  getPackageVersion: jest.fn().mockReturnValue(PACKAGE_VERSION),
}));

import {
  getStaticAppTemplate,
  generateCspString,
  getLambdaEdgeOriginResponseZipFile,
  CLOUDFRONT_DISTRIBUTION_LOGICAL_ID,
} from './staticApp.template';

const defaultCspString =
  "default-src 'self'; connect-src 'self' https:; script-src 'self'; img-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com/; font-src 'self' https://fonts.gstatic.com/; object-src 'none'";

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

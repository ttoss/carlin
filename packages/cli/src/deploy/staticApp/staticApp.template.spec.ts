import {
  getStaticAppTemplate,
  generateScp,
  getLambdaEdgeOriginResponseZipFile,
  CLOUDFRONT_DISTRIBUTION_LOGICAL_ID,
} from './staticApp.template';

/**
 * Mock to snapshots don't fail.
 */
Date.now = jest.fn(() => 1487076708000);

const PACKAGE_VERSION = '10.40.23';

jest.mock('../../utils', () => ({
  getPackageVersion: jest.fn().mockReturnValue('10.40.23'),
}));

describe("fix issue 'Add Google Marketing Platform to SCP' #3 https://github.com/ttoss/carlin/issues/3", () => {
  const defaultScp =
    "default-src 'self'; connect-src 'self' https:; img-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com/; font-src 'self' https://fonts.gstatic.com/; object-src 'none'";

  test('generate default SCP', () => {
    expect(generateScp()).toEqual(defaultScp);
  });

  test('add new directive', () => {
    expect(generateScp({ scp: { newDirective: "'some text'" } })).toContain(
      "newDirective 'some text'",
    );
  });

  test('append directive', () => {
    const expected = /default-src .*'some text'/;
    expect(generateScp({ scp: { 'default-src': "'some text'" } })).toMatch(
      expected,
    );
    expect(generateScp({ scp: { 'default-src': ["'some text'"] } })).toMatch(
      expected,
    );
  });

  test('replace directive', () => {
    expect(
      generateScp({ scp: { 'default-src': ["'some text'", 'replace'] } }),
    ).toContain("default-src 'some text'");
  });

  test('should add scp to Lambda@Edge Origin response', () => {
    expect(getLambdaEdgeOriginResponseZipFile()).toContain(
      `value: "${defaultScp}"`,
    );
  });
});

describe("fix issue 'PWA doesn't redirect correctly when browser URL has a path' #1 https://github.com/ttoss/carlin/issues/1", () => {
  test('cloudfront', () => {
    expect(
      getStaticAppTemplate({ cloudfront: true }).Resources[
        CLOUDFRONT_DISTRIBUTION_LOGICAL_ID
      ].Properties.DistributionConfig.Origins[0].OriginPath,
    ).toEqual(`/${PACKAGE_VERSION}`);
  });

  test('cloudfront CustomErrorResponses, spa=false', () => {
    expect(
      getStaticAppTemplate({ cloudfront: true, spa: false }).Resources[
        CLOUDFRONT_DISTRIBUTION_LOGICAL_ID
      ].Properties.DistributionConfig.CustomErrorResponses,
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
      getStaticAppTemplate({ cloudfront: true, spa: true }).Resources[
        CLOUDFRONT_DISTRIBUTION_LOGICAL_ID
      ].Properties.DistributionConfig.CustomErrorResponses,
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

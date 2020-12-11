import {
  getStaticAppTemplate,
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

describe('fix issue #1 https://github.com/ttoss/carlin/issues/1', () => {
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

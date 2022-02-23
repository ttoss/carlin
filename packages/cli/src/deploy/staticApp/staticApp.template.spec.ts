/* eslint-disable no-eval */
/* eslint-disable import/first */

import * as faker from 'faker';

const region = faker.random.word();

/**
 * Mock to snapshots don't fail.
 */
Date.now = jest.fn(() => 1487076708000);
const PACKAGE_VERSION = '10.40.23';

jest.mock('../../utils', () => ({
  ...(jest.requireActual('../../utils') as any),
  getPackageVersion: jest.fn().mockReturnValue(PACKAGE_VERSION),
}));

import {
  getStaticAppTemplate,
  CLOUDFRONT_DISTRIBUTION_LOGICAL_ID,
  ROUTE_53_RECORD_SET_GROUP_LOGICAL_ID,
} from './staticApp.template';

test('should define default root object', () => {
  const template = getStaticAppTemplate({ region, cloudfront: true });

  expect(
    template.Resources[CLOUDFRONT_DISTRIBUTION_LOGICAL_ID].Properties
      .DistributionConfig.DefaultRootObject,
  ).toEqual('index.html');
});

test('should not add CloudFront distribution', () => {
  const template = getStaticAppTemplate({ region, cloudfront: false });

  expect(
    template.Resources[CLOUDFRONT_DISTRIBUTION_LOGICAL_ID],
  ).toBeUndefined();
});

test('should define Route53 RecordSetGroup', () => {
  const template = getStaticAppTemplate({
    region,
    cloudfront: true,
    aliases: ['example.com'],
    hostedZoneName: 'example.com',
  });

  expect(
    template.Resources[ROUTE_53_RECORD_SET_GROUP_LOGICAL_ID].Properties
      .HostedZoneName,
  ).toEqual('example.com.');

  expect(
    template.Resources[ROUTE_53_RECORD_SET_GROUP_LOGICAL_ID].Properties
      .RecordSets[0].Type,
  ).toEqual('A');
});

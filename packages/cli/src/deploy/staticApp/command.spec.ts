/* eslint-disable import/first */
import AWS from 'aws-sdk';
import faker from 'faker';
import yargs from 'yargs';

import { CLOUDFRONT_REGION } from '../../config';

const destroyCloudFormationMock = jest.fn();

jest.mock('../cloudFormation', () => ({
  destroyCloudFormation: destroyCloudFormationMock,
}));

const deployStaticAppMock = jest.fn();

jest.mock('./staticApp', () => ({
  ...(jest.requireActual('./staticApp') as any),
  deployStaticApp: deployStaticAppMock,
}));

import { deployStaticAppCommand } from './command';

const cli = yargs.command(deployStaticAppCommand);

const parse = (options: any) =>
  new Promise<any>((resolve, reject) => {
    cli.parse('static-app', options, (err, argv) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(argv);
    });
  });

describe('region should be us-east-1', () => {
  beforeEach(() => {
    AWS.config.region = undefined;
  });

  test.each([
    [undefined],
    ['us-east-1'],
    ['us-east-2'],
    ['us-west-1'],
    ['us-west-2'],
    ['sa-east-1'],
  ])('should return us-east-1 if region option is: %s', async () => {
    const argv = await parse({});
    expect(argv.region).toEqual(CLOUDFRONT_REGION);
    expect(AWS.config.region).toEqual(CLOUDFRONT_REGION);
    expect(deployStaticAppMock).toHaveBeenCalledWith(
      expect.objectContaining({ region: CLOUDFRONT_REGION }),
    );
  });
});

describe('aliases implies acm', () => {
  test('should throw because alias is defined and acm not', () => {
    return expect(parse({ aliases: ['some alias'] })).rejects.toThrow();
  });

  test('should not throw because amc and alias are defined', () => {
    const options = { acm: 'some-acm', aliases: ['some alias'] };
    return expect(parse(options)).resolves.toEqual(
      expect.objectContaining(options),
    );
  });
});

describe('handling methods', () => {
  test('should call deployStaticApp', async () => {
    const options = {
      acm: faker.random.word(),
      aliases: [faker.random.word()],
      cloudfront: true,
      csp: {},
      gtmId: faker.random.word(),
      spa: true,
    };

    await parse(options);

    expect(deployStaticAppMock).toHaveBeenCalledWith(
      expect.objectContaining(options),
    );
  });

  test('should call destroyCloudFormation', async () => {
    const options = {
      destroy: true,
      acm: faker.random.word(),
      aliases: [faker.random.word()],
      cloudfront: true,
      csp: {},
      gtmId: faker.random.word(),
      spa: true,
    };

    await parse(options);

    expect(destroyCloudFormationMock).toHaveBeenCalled();
  });
});

describe('should set cloudfront', () => {
  const testHelper = async (optionsArray: any[], every: boolean) => {
    const results = await Promise.all(
      optionsArray.map(async (options) => {
        const { cloudfront } = await parse(options);
        return cloudfront;
      }),
    );

    return results.every((value) => value === every);
  };

  test('cloudfront must be true', () => {
    const options = [
      {
        acm: 'some string',
      },
      {
        acm: faker.random.word(),
        aliases: [faker.random.word()],
      },
      {
        cloudfront: true,
      },
      {
        csp: {},
      },
      {
        gtmId: faker.random.word(),
      },
      {
        spa: true,
      },
    ];

    return expect(testHelper(options, true)).resolves.toBeTruthy();
  });

  test('cloudfront must be false', () => {
    const options = [
      {
        buildFolder: faker.random.word(),
      },
      {
        cloudfront: false,
      },
      {
        skipUpload: false,
      },
      {
        spa: false,
      },
    ];

    return expect(testHelper(options, false)).resolves.toBeTruthy();
  });
});

import faker from 'faker';
import yargs from 'yargs';

import { deployStaticAppCommand } from './command';

// import { destroyCloudFormation } from '../cloudFormation';

// import { deployStaticApp } from './staticApp';

jest.mock('../cloudFormation');

jest.mock('./staticApp');

const randomString = faker.random.word();

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
        acm: randomString,
        aliases: [randomString],
      },
      {
        cloudfront: true,
      },
      {
        csp: {},
      },
      {
        gtmId: randomString,
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
        buildFolder: randomString,
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

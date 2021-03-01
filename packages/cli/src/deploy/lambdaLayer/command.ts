/* eslint-disable no-param-reassign */
import log from 'npmlog';
import { CommandModule, InferredOptionTypes } from 'yargs';

import { NAME } from '../../config';
import { addGroupToOptions } from '../../utils';

import { deployLambdaLayer } from './deployLambdaLayer';

const logPrefix = 'deploy-lambda-layer';

export const options = {
  packages: {
    array: true,
    describe: "NPM packages' names to be deployed as Lambda Layers. ",
    required: true,
    type: 'string',
  },
} as const;

/**
 * https://stackoverflow.com/a/64880672/8786986
 */
const packageNameRegex = /@[~^]?([\dvx*]+(?:[-.](?:[\dx*]+|alpha|beta))*)/;

export const deployLambdaLayerCommand: CommandModule<
  any,
  InferredOptionTypes<typeof options>
> = {
  command: 'lambda-layer',
  describe: 'Deploy Lambda Layer.',
  builder: (yargs) =>
    yargs
      .options(addGroupToOptions(options, 'Deploy Lambda Layer Options'))
      .check(({ packages }) => {
        const invalidPackages = packages
          .map((packageName) => {
            return packageNameRegex.test(packageName) ? undefined : packageName;
          })
          .filter((packageName) => !!packageName);

        if (invalidPackages.length > 0) {
          throw new Error(
            `Some package names are invalid: ${invalidPackages.join(', ')}`,
          );
        } else {
          return true;
        }
      }),
  handler: ({ destroy, ...rest }) => {
    if (destroy) {
      log.info(logPrefix, `${NAME} doesn't destroy lambda layers.`);
    } else {
      deployLambdaLayer(rest as any);
    }
  },
};

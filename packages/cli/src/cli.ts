/* eslint-disable no-param-reassign */
import { constantCase, paramCase } from 'change-case';
import deepmerge from 'deepmerge';
import findUp from 'find-up';
import path from 'path';
import * as yargs from 'yargs';

import { NAME } from './config';

import { deployCommand } from './deploy/command';
import { addGroupToOptions, setEnvironment, readObjectFile } from './utils';

export const options = {
  config: {
    alias: 'c',
    describe: 'Path to config file.',
    require: false,
    type: 'string',
  },
  environment: {
    alias: ['e', 'env'],
    coerce: (environment: string) => {
      if (environment) {
        setEnvironment(environment);
      }
      return environment;
    },
    type: 'string',
  },
  environments: {},
} as const;

/**
 * Transformed to method because finalConfig was failing the tests.
 */
const cli = () => {
  /**
   * All config files merged.
   */
  let finalConfig: any;

  /**
   * Get all carlin configs from directories.
   */
  const getConfig = () => {
    const names = ['js', 'yml', 'yaml', 'json'].map((ext) => `${NAME}.${ext}`);
    const paths = [];
    let currentPath = process.cwd();
    let findUpPath: string | undefined;

    do {
      findUpPath = findUp.sync(names, { cwd: currentPath });
      if (findUpPath) {
        currentPath = path.resolve(findUpPath, '../..');
        paths.push(findUpPath);
      }
    } while (findUpPath);

    const configs = paths.map((p) => readObjectFile({ path: p }) || {});

    /**
     * Using configs.reverser() to get the most far config first. This way the
     * nearest configs will replace others.
     */
    finalConfig = deepmerge.all(configs.reverse());

    return finalConfig;
  };

  return yargs
    .scriptName(NAME)
    .env(constantCase(NAME))
    .options(addGroupToOptions(options, 'Common Options'))
    .middleware(((argv: any, { parsed }: any) => {
      const { environment, environments } = argv;

      /**
       * Create final options with environment and environments.
       */
      if (environment && environments && environments[environment as string]) {
        Object.entries(environments[environment]).forEach(([key, value]) => {
          /**
           * The case where argv[key] must not have the environment value is
           * when such value is passed as option via CLI. For instance,
           *
           * $ carlin deploy --stack-name SomeName
           *
           * SomeName must be used as stack name independently of the
           * environment values https://github.com/ttoss/carlin/issues/13.
           *
           * Three cases set argv:
           *
           * 1. Default.
           * 2. Config file.
           * 3. CLI
           *
           * - Case 1 we determine if the parsed.defaulted is true.
           * - Case 2 we determine if `argv[key] === finalConfig[key]`.
           * - Case 3 if the two above are falsy.
           */
          const isKeyFormCli = (() => {
            const paramCaseKey = paramCase(key);

            /**
             * Fixes #16 https://github.com/ttoss/carlin/issues/16
             */
            if (parsed?.defaulted?.[paramCaseKey]) {
              return false;
            }

            /**
             * Fixes #13 https://github.com/ttoss/carlin/issues/13
             */
            if (argv[key] === finalConfig[key]) {
              return false;
            }

            return true;
          })();

          if (!isKeyFormCli) {
            argv[key] = value;
          }
        });
      }
    }) as any)
    .pkgConf(NAME)
    .config(getConfig())
    .config('config', (configPath: string) =>
      readObjectFile({ path: configPath }),
    )
    .command({
      command: 'print-args',
      describe: false,
      handler: (argv) => console.log(JSON.stringify(argv, null, 2)),
    })
    .command(deployCommand)
    .help();
};

export default cli;

import { constantCase } from 'change-case';
import deepmerge from 'deepmerge';
import findUp from 'find-up';
import path from 'path';
import * as yargs from 'yargs';

import { NAME } from './config';

import { deployCommand } from './deploy/command';
import { setEnvironment, readObjectFile } from './utils';

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
  const finalConfig: any = deepmerge.all(configs.reverse());

  return finalConfig;
};

yargs
  .scriptName(NAME)
  .env(constantCase(NAME))
  .options({
    config: {
      alias: 'c',
      describe: 'Path to JavaScript, JSON or YAML file.',
      require: false,
      type: 'string',
    },
    environment: {
      alias: ['e', 'env'],
      coerce: (environment) => {
        if (environment) {
          setEnvironment(environment);
        }
        return environment;
      },
      type: 'string',
    },
    environments: {
      type: 'string',
    },
  })
  .middleware((argv) => {
    const { environment, environments } = argv as any;
    /**
     * Create final options with environment and environments.
     */
    if (environment && environments && environments[environment as string]) {
      Object.entries(environments[environment]).forEach(([key, value]) => {
        // eslint-disable-next-line no-param-reassign
        argv[key] = value;
      });
    }
  })
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

export default yargs;

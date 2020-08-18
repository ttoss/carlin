import { constantCase } from 'change-case';
import deepmerge from 'deepmerge';
import findUp from 'find-up';
import path from 'path';
import yargs from 'yargs';

import { NAME } from './config';

import { deployCommand } from './deploy/command';
import { monorepoCommand } from './monorepo/command';
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
  const configs = paths.map((p) => readObjectFile({ path: p }));
  /**
   * Using configs.reverser() to get the most far config first. This way the
   * nearest configs will replace others.
   */
  let finalConfig: any = deepmerge.all(configs.reverse());

  const { environment } = yargs.argv;
  const { environments } = finalConfig;

  /**
   * Create final options with environment and environments.
   */
  if (environment && environments && environments[environment as string]) {
    finalConfig = deepmerge.all([
      finalConfig,
      environments[environment as string],
    ]);
  }

  return finalConfig;
};

yargs
  .help()
  .scriptName(NAME)
  .env(constantCase(NAME))
  .options({
    config: {
      alias: 'c',
      require: false,
      type: 'string',
    },
    environment: {
      alias: ['e', 'env'],
      type: 'string',
    },
    environments: {
      type: 'string',
    },
  })
  .middleware(({ environment }) => {
    if (environment) {
      setEnvironment(environment);
    }
  }, true)
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
  .command(monorepoCommand);

export default yargs;

import deepmerge from 'deepmerge';
import findUp from 'find-up';
import path from 'path';
import yargs from 'yargs';

import { setEnvironment, readObjectFile } from './utils';

import { deployCommand } from './deploy/command';
import { monorepoCommand } from './monorepo/command';

/**
 * Get all pepe configs from directories.
 */
const getConfig = () => {
  const names = ['js', 'yml', 'yaml', 'json'].map((ext) => `pepe.${ext}`);
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
  const finalConfig = deepmerge.all(configs);
  return finalConfig;
};

yargs
  .env('PEPE')
  .pkgConf('pepe')
  .config(getConfig())
  .config('config', (configPath: string) =>
    readObjectFile({ path: configPath }),
  )
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
      alias: 'envs',
      hidden: true,
    },
  })
  .middleware((argv) => {
    const { environment, environments } = argv;
    if (environment) {
      setEnvironment(environment);
      if ((environments as any)?.[environment]) {
        Object.entries((environments as any)[environment]).forEach(
          ([key, value]) => {
            // eslint-disable-next-line no-param-reassign
            argv[key] = value;
          },
        );
      }
    }
  }, true)
  .command({
    command: 'print-args',
    describe: false,
    handler: (argv) => console.log(JSON.stringify(argv, null, 2)),
  })
  .command(deployCommand)
  .command(monorepoCommand)
  .help();

export default yargs;

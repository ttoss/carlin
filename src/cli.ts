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
  let currentPath = process.cwd();
  const paths = [];
  while (true) {
    const p = findUp.sync(names, { cwd: currentPath });
    if (p) {
      currentPath = path.resolve(p, '../..');
      paths.push(p);
    } else {
      break;
    }
  }
  const configs = paths.map((p) => readObjectFile({ path: p }));
  const finalConfig = deepmerge.all(configs);
  return finalConfig;
};

yargs
  .env('PEPE')
  .pkgConf('pepe')
  .config(getConfig())
  .config('config', (path: string) => readObjectFile({ path }))
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
    const { environment } = argv;
    const environments: any = argv.environments;
    if (environment) {
      setEnvironment(environment);
      if (environments && environments[environment]) {
        Object.entries(environments[environment]).forEach(([key, value]) => {
          argv[key] = value;
        });
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

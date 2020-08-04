import findUp from 'find-up';
import yargs from 'yargs';

import { setEnvironment, readObjectFile } from './utils';

import { deployCommand } from './deploy/command';
import { monorepoCommand } from './monorepo/command';

const getConfig = () => {
  const path = findUp.sync(
    ['js', 'yml', 'yaml', 'json'].map((ext) => `pepe.${ext}`)
  );
  return path ? readObjectFile({ path }) : {};
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

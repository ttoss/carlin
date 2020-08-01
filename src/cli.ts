import findUp from 'find-up';
import yargs from 'yargs';

import { readObjectFile } from './utils';

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
  })
  .command({
    command: 'print-args',
    describe: false,
    handler: console.log,
  })
  .command(deployCommand)
  .command(monorepoCommand)
  .help();

export default yargs;

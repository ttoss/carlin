import AWS from 'aws-sdk';
import fs from 'fs';
// import log from 'npmlog';
import yargs from 'yargs';

import { readObjectFile } from './utils';

import { deployCommand } from './deploy/command';

// const logPrefix = 'bootstrap';

const configHandler = (path: string) => {
  /**
   * If path does not ends with /pepe, then is not default and the user is
   * using a custom path.
   */
  if (!path.endsWith('/pepe')) {
    return readObjectFile({ path });
  }

  const allowedExtensions = ['js', 'yml', 'yaml', 'json'];

  const pathWhichExists = allowedExtensions.reduce<string>((acc, extension) => {
    const newPath = `${path}.${extension}`;
    if (fs.existsSync(newPath)) {
      return newPath;
    }
    return acc;
  }, '');

  if (pathWhichExists) {
    return readObjectFile({ path: pathWhichExists });
  }

  return {};
};

yargs
  .pkgConf('pepe')
  .config('config', configHandler)
  .options({
    config: {
      alias: 'c',
      default: 'pepe',
      require: false,
      type: 'string',
    },
  })
  .command(deployCommand)
  .help();

export default yargs;

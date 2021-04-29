/* eslint-disable no-param-reassign */
import fs from 'fs';
import log from 'npmlog';
import { CommandModule, InferredOptionTypes } from 'yargs';

import { NAME } from '../../config';
import { addGroupToOptions } from '../../utils';

import { deployCicd } from './deployCicd';

const logPrefix = 'deploy-cicd';

/**
 * Created to allow mocking.
 */
export const sshKeyCoerce = (dir: string) => fs.readFileSync(dir, 'utf-8');

export const options = {
  'ssh-key': {
    coerce: (dir: string) => sshKeyCoerce(dir),
    demandOption: true,
    type: 'string',
  },
  'ssh-url': {
    demandOption: true,
    type: 'string',
  },
} as const;

export const deployCicdCommand: CommandModule<
  any,
  InferredOptionTypes<typeof options>
> = {
  command: 'cicd',
  describe: 'Deploy CICD.',
  builder: (yargs) =>
    yargs.options(addGroupToOptions(options, 'Deploy CICD Options')),
  handler: ({ destroy, ...rest }) => {
    if (destroy) {
      log.info(logPrefix, `${NAME} doesn't destroy CICD stack.`);
    } else {
      deployCicd(rest as any);
    }
  },
};

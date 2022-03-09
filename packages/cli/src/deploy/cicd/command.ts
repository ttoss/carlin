/* eslint-disable no-param-reassign */
import fs from 'fs';
import log from 'npmlog';
import { CommandModule, InferredOptionTypes } from 'yargs';

import { NAME } from '../../config';
import { addGroupToOptions } from '../../utils';

import { deployCicd } from './deployCicd';

import { options } from './command.options';

const logPrefix = 'deploy-cicd';

/**
 * Created to allow mocking.
 */
export const readSSHKey = (dir: string) => fs.readFileSync(dir, 'utf-8');

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
      deployCicd({
        ...rest,
        sshKey: readSSHKey(rest['ssh-key']),
      } as any);
    }
  },
};

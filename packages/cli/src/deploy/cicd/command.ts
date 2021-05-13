/* eslint-disable no-param-reassign */
import { camelCase } from 'change-case';
import fs from 'fs';
import log from 'npmlog';
import { CommandModule, InferredOptionTypes } from 'yargs';

import { NAME } from '../../config';
import { addGroupToOptions } from '../../utils';

import { pipelines } from './pipelines';
import { deployCicd } from './deployCicd';

const logPrefix = 'deploy-cicd';

/**
 * Created to allow mocking.
 */
export const readSSHKey = (dir: string) => fs.readFileSync(dir, 'utf-8');

export const options = {
  cpu: {
    type: 'string',
  },
  memory: {
    type: 'string',
  },
  pipelines: {
    choices: pipelines,
    coerce: (values: string[]) => values.map((value) => camelCase(value)),
    default: [],
    description: 'Pipelines that will be implemented with the CICD stack.',
    type: 'array',
  },
  'repository-update': {
    alias: ['update-repository', 'ur', 'ru'],
    description: 'Determine if the repository image will be updated.',
    default: true,
    type: 'boolean',
  },
  'ssh-key': {
    demandOption: true,
    type: 'string',
  },
  'ssh-url': {
    demandOption: true,
    type: 'string',
  },
  /**
   * This option has the format:
   *
   * ```ts
   * Array<{
   *  Name: string,
   *  Value: string,
   * }>
   * ```
   */
  'task-environment': {
    alias: ['te'],
    default: [],
    describe:
      'A list of environment variables that will be passed to the ECS container task.',
    type: 'array',
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
      deployCicd({
        ...rest,
        sshKey: readSSHKey(rest['ssh-key']),
      } as any);
    }
  },
};

export const pipelines = ['pr', 'main', 'tag'] as const;

export type Pipelines = typeof pipelines;

export type Pipeline = Pipelines[number];

export const getCommandFileDir = (pipeline: Pipeline | 'closed-pr') =>
  `./cicd/commands/${pipeline}`;

export const getPrCommands = ({ branch }: { branch: string }) => [
  'set -e',
  'git status',
  'git fetch',
  /**
   * Update to the most recent main branch to Lerna performs the diff properly.
   */
  'git pull origin main',
  `git checkout ${branch}`,
  `git pull origin ${branch}`,
  'git rev-parse HEAD',
  'git status',
  'yarn',
  `sh -e ${getCommandFileDir('pr')}`,
];

export const getClosedPrCommands = ({ branch }: { branch: string }) => [
  'git status',
  'git fetch',
  /**
   * Get the most recent main because the PR was approved.
   */
  'git pull origin main',
  'git rev-parse HEAD',
  `export CARLIN_BRANCH=${branch}`,
  `[ -f "${getCommandFileDir('closed-pr')}" ] && sh ${getCommandFileDir(
    'closed-pr',
  )}`,
];

export const getMainCommands = () => [
  'set -e',
  `export CARLIN_ENVIRONMENT=Staging`,
  'git status',
  'git fetch',
  'git pull origin main',
  'git rev-parse HEAD',
  /**
   * Reporting `MainTagFound` before exiting the process. This command blocks
   * the process if tag was found. If we don't do this, the loop would never
   * end.
   */
  'if git describe --exact-match; then echo "Tag found" && carlin cicd-ecs-task-report --status=MainTagFound && exit 0; fi',
  'yarn',
  `sh -e ${getCommandFileDir('main')}`,
];

export const getTagCommands = ({ tag }: { tag: string }) => [
  'set -e',
  `export CARLIN_ENVIRONMENT=Production`,
  'git status',
  'git fetch --tags',
  `git checkout tags/${tag} -b ${tag}-branch`,
  'git rev-parse HEAD',
  'yarn',
  `sh -e ${getCommandFileDir('tag')}`,
];

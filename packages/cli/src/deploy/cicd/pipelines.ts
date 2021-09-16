export const pipelines = ['pr', 'closed-pr', 'main', 'tag'] as const;

export type Pipelines = typeof pipelines;

export type Pipeline = Pipelines[number];

const executeCommandFile = (pipeline: Pipeline) =>
  `chmod +x ./cicd/commands/${pipeline} && ./cicd/commands/${pipeline}`;

export const getPrCommands = ({ branch }: { branch: string }) => [
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
  executeCommandFile('pr'),
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
  executeCommandFile('closed-pr'),
];

export const getMainCommands = () => [
  `export CARLIN_ENVIRONMENT=Staging`,
  'git status',
  'git fetch',
  'git pull origin main',
  'git rev-parse HEAD',
  'git describe --abbrev=0 --tags && echo "Found a tag" && exit 0',
  'yarn',
  executeCommandFile('main'),
];

export const getTagCommands = ({ tag }: { tag: string }) => [
  `export CARLIN_ENVIRONMENT=Production`,
  'git status',
  'git fetch --tags',
  `git checkout tags/${tag} -b ${tag}-branch`,
  'git rev-parse HEAD',
  'yarn',
  executeCommandFile('tag'),
];

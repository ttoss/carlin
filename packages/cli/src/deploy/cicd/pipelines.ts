export const pipelines = ['pr', 'main', 'tag'] as const;

export type Pipelines = typeof pipelines;

export type Pipeline = Pipelines[number];

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
  'npx lerna ls --since=main',
  /**
   * Apply lint only on the modified files.
   */
  `git diff --name-only HEAD..main | grep -E '\\.(j|t)sx?$' | xargs npx eslint --no-error-on-unmatched-pattern`,
  /**
   * Execute tests only on the modified packages.
   */
  `npx lerna run "test" --since=main --stream --parallel`,
  /**
   * Build only modified packages.
   */
  `npx lerna run "build" --since=main --stream --parallel`,
  /**
   * Deploy only the modified packages.
   */
  `npx lerna run "deploy" --since=main --stream --parallel`,
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
  `npx lerna run "deploy" --stream --parallel -- --destroy`,
];

export const getMainCommands = () => [
  'git status',
  'git fetch',
  'git pull origin main',
  'git rev-parse HEAD',
  'yarn',
  `export CARLIN_ENVIRONMENT=Staging`,
  `npx lerna run "test" --stream --parallel`,
  `npx lerna run "build" --stream --parallel`,
  `npx lerna run "deploy" --stream --parallel`,
];

export const getTagCommands = ({ tag }: { tag: string }) => [
  'git status',
  'git fetch --tags',
  `git checkout tags/${tag} -b ${tag}-branch`,
  'git rev-parse HEAD',
  'yarn',
  `export CARLIN_ENVIRONMENT=Production`,
  `npx lerna run "test" --stream --parallel`,
  `npx lerna run "build" --stream --parallel`,
  `npx lerna run "deploy" --stream --parallel`,
];

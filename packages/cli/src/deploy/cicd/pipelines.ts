export const pipelines = ['pr', 'main'] as const;

export type Pipelines = typeof pipelines;

export type Pipeline = Pipelines[number];

export const getPrCommands = ({ branch }: { branch: string }) => [
  'git status',
  'git fetch',
  `git checkout ${branch}`,
  'git status',
  'yarn',
  'npx lerna ls --since',
  /**
   * Apply lint only on the modified files.
   */
  `git diff --name-only HEAD..main | grep -E '\\.(j|t)sx?$' | xargs npx eslint --no-error-on-unmatched-pattern`,
  /**
   * Execute tests only on the modified packages.
   */
  `npx lerna run "test" --since --stream --parallel`,
  /**
   * Build only modified packages.
   */
  `npx lerna run "build" --since --stream --parallel`,
  /**
   * Deploy only the modified packages.
   */
  `npx lerna run "deploy" --since --stream --parallel`,
];

export const getClosedPrCommands = ({ branch }: { branch: string }) => [
  `export CARLIN_BRANCH=${branch}`,
  `npx lerna run "deploy" --since --stream --parallel -- --destroy`,
];

export const getMainCommands = () => [
  'yarn',
  'git fetch',
  'git pull origin main',
  'yarn test',
  'CARLIN_ENVIRONMENT=Staging yarn deploy',
];

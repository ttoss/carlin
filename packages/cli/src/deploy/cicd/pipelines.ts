export const pipelines = ['pr', 'main'] as const;

export type Pipelines = typeof pipelines;

export type Pipeline = Pipelines[number];

export const getPrCommands = ({ branch }: { branch: string }) => [
  'git status',
  'git fetch',
  `git checkout ${branch}`,
  'git status',
  'yarn',
  `git diff --name-only HEAD..main | grep -E '\\.(j|t)sx?$' | xargs npx eslint --no-error-on-unmatched-pattern`,
  'npx lerna ls --since',
  `npx lerna run "test" --since --stream --parallel`,
  `CARLIN_BRANCH=${branch} npx lerna run "deploy" --since --stream --parallel`,
];

export const getMainCommands = () => [
  'yarn',
  'git fetch',
  'git pull origin main',
  'yarn test',
  'CARLIN_ENVIRONMENT=Staging yarn deploy',
];

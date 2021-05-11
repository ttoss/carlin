export const pipelines = ['pr', 'main'] as const;

export type Pipelines = typeof pipelines;

export type Pipeline = Pipelines[number];

export const getPrCommands = ({ branch }: { branch: string }) => [
  'yarn',
  'git fetch',
  `git checkout ${branch}`,
  `git diff --name-only HEAD..main | grep -E '\\.(j|t)sx?$' | xargs npx eslint --no-error-on-unmatched-pattern`,
  'yarn test',
  `CARLIN_BRANCH=${branch} yarn deploy`,
];

export const getMainCommands = () => [
  'yarn',
  'git fetch',
  'git pull origin main',
  'yarn test',
  'CARLIN_ENVIRONMENT=Staging yarn deploy',
];

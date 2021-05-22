import * as faker from 'faker';

import * as pipelinesModule from './pipelines';

const branch = faker.random.word();

const tag = faker.random.word();

test('pipelines', () => {
  expect(pipelinesModule.pipelines).toEqual(['pr', 'main', 'tag']);
});

test('getClosedPrCommands', () => {
  expect(pipelinesModule.getClosedPrCommands({ branch })).toEqual([
    'git status',
    'git fetch',
    'git pull origin main',
    'git rev-parse HEAD',
    `export CARLIN_BRANCH=${branch}`,
    `npx lerna run "deploy" --stream --parallel -- --destroy`,
  ]);
});

test('getMainCommands', () => {
  expect(pipelinesModule.getMainCommands()).toEqual([
    'git status',
    'git fetch',
    'git pull origin main',
    'git rev-parse HEAD',
    'yarn',
    `export CARLIN_ENVIRONMENT=Staging`,
    `npx lerna run "build" --stream --parallel`,
    `npx lerna run "test" --stream --parallel`,
    `npx lerna run "deploy" --stream --parallel`,
  ]);
});

test('getTagCommands', () => {
  expect(pipelinesModule.getTagCommands({ tag })).toEqual([
    'git status',
    'git fetch --tags',
    `git checkout tags/${tag} -b ${tag}-branch`,
    'git rev-parse HEAD',
    'yarn',
    `export CARLIN_ENVIRONMENT=Production`,
    `npx lerna run "build" --stream --parallel`,
    `npx lerna run "test" --stream --parallel`,
    `npx lerna run "deploy" --stream --parallel`,
  ]);
});

test('getPrCommands', () => {
  expect(pipelinesModule.getPrCommands({ branch })).toEqual([
    'git status',
    'git fetch',
    'git pull origin main',
    `git checkout ${branch}`,
    `git pull origin ${branch}`,
    'git rev-parse HEAD',
    'git status',
    'yarn',
    'npx lerna ls --since=main',
    `git diff --name-only HEAD..main | grep -E "\\.(j|t)sx?$" | xargs npx eslint --no-error-on-unmatched-pattern`,
    `npx lerna run "build" --since=main --stream --parallel`,
    `npx lerna run "test" --since=main --stream --parallel`,
    `npx lerna run "deploy" --since=main --stream --parallel`,
  ]);
});

import * as pipelinesModule from './pipelines';

test('pipelines', () => {
  expect(pipelinesModule.pipelines).toMatchObject(
    expect.arrayContaining(['pr', 'main', 'tag', 'closed-pr']),
  );
});

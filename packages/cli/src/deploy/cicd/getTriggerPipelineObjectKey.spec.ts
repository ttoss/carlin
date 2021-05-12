import { getTriggerPipelinesObjectKey } from './getTriggerPipelineObjectKey';

test('main pipeline', () => {
  expect(getTriggerPipelinesObjectKey('main')).toContain('/main.zip');
});

test('tag pipeline', () => {
  expect(getTriggerPipelinesObjectKey('tag')).toContain('/tag.zip');
});

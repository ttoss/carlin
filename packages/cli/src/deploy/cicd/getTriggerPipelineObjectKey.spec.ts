import * as faker from 'faker';

import { getTriggerPipelinesObjectKey } from './getTriggerPipelineObjectKey';
import { Pipeline } from './pipelines';

const prefix = faker.random.word();

test.each<[Pipeline]>([['tag'], ['main']])('main pipeline', (pipeline) => {
  expect(getTriggerPipelinesObjectKey({ prefix, pipeline })).toContain(
    `${prefix}/${pipeline}.zip`,
  );
});

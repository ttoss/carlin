import * as faker from 'faker';

import { getJobDetailsFilename } from './pipelines.handler';

test('test getJobDetailsFilename', () => {
  const jobId = faker.datatype.uuid();
  expect(getJobDetailsFilename(jobId)).toEqual(`/tmp/${jobId}.zip`);
});

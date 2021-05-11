import type { Pipeline } from './pipelines';

export const TRIGGER_PIPELINES_OBJECT_KEY_PREFIX = 'cicd/pipelines/triggers/';

export const getTriggerPipelinesObjectKey = (pipeline: Pipeline) => {
  return `${TRIGGER_PIPELINES_OBJECT_KEY_PREFIX}${pipeline}.zip`;
};

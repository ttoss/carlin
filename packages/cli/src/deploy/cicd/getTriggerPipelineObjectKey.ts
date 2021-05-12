import type { Pipeline } from './pipelines';

export const TRIGGER_PIPELINES_OBJECT_KEY_PREFIX = 'cicd/pipelines/triggers/';

/**
 * The file with this key inside the source S3 key of main and tag pipelines
 * will trigger those pipelines.
 */
export const getTriggerPipelinesObjectKey = (pipeline: Pipeline) => {
  return `${TRIGGER_PIPELINES_OBJECT_KEY_PREFIX}${pipeline}.zip`;
};

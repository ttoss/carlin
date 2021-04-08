import { pascalCase } from 'change-case';

import { NAME } from '../../config';

export const BASE_STACK_NAME = `${pascalCase(NAME)}BaseStack`;
export const BASE_STACK_BUCKET_TEMPLATES_FOLDER = 'cloudformation-templates';

/**
 * S3 Bucket.
 */
export const BASE_STACK_BUCKET_LOGICAL_NAME = `${pascalCase(NAME)}Bucket`;

export const BASE_STACK_BUCKET_NAME_EXPORTED_NAME = `${pascalCase(
  NAME,
)}BucketNameExportedName`;

/**
 * Lambda image builder.
 */
export const BASE_STACK_LAMBDA_IMAGE_BUILDER_LOGICAL_NAME = `${pascalCase(
  NAME,
)}LambdaImageBuilder`;

export const BASE_STACK_LAMBDA_IMAGE_BUILDER_EXPORTED_NAME = `${pascalCase(
  NAME,
)}LambdaImageBuilderExportedName`;

/**
 * Lambda layer builder.
 */
export const BASE_STACK_LAMBDA_LAYER_BUILDER_LOGICAL_NAME = `${pascalCase(
  NAME,
)}LambdaLayerBuilder`;

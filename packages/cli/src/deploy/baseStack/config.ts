import { pascalCase } from 'change-case';

import { NAME } from '../../config';

export const BASE_STACK_NAME = `${pascalCase(NAME)}CarlinBaseStack`;
export const BASE_STACK_BUCKET_TEMPLATES_FOLDER = 'cloudformation-templates';
export const BASE_STACK_BUCKET_LOGICAL_NAME = `${pascalCase(NAME)}Bucket`;
export const BASE_STACK_BUCKET_NAME_EXPORTED_NAME = `${pascalCase(
  NAME,
)}BucketNameExportedName`;

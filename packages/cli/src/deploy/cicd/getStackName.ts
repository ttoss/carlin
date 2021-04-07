import { pascalCase } from 'change-case';

import { NAME } from '../../config';
import { getProjectName } from '../../utils/getProjectName';

export const getStackName = () => {
  const project = getProjectName();
  return pascalCase([NAME, 'Cicd', project].join(' '));
};

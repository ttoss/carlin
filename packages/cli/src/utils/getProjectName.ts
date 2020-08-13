import { pascalCase } from 'change-case';

import { getPackageName } from './packageJson';

export const getProjectName = () => {
  if (process.env.PROJECT_NAME) {
    return process.env.PROJECT_NAME;
  }

  const name = getPackageName();

  try {
    return pascalCase(name.split(/[@/]/)[1]);
  } catch (err) {
    return pascalCase(name);
  }
};

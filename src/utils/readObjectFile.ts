import fs from 'fs';

import { readCloudFormationTemplate } from './cloudFormationTemplate';

export const readYaml = ({ path }: { path: string }) => {
  const template = fs.readFileSync(path, 'utf8');
  return readCloudFormationTemplate({ template });
};

export const readObjectFile = ({ path }: { path: string }) => {
  if (!fs.existsSync(path)) {
    return {};
  }

  const extension = path.split('.').pop();

  if (extension === 'js') {
    const obj = require(path);
    if (typeof obj === 'function') {
      return obj();
    }
    return obj;
  }

  if (extension === 'json') {
    return require(path);
  }

  if (extension === 'yml' || extension === 'yaml') {
    return readYaml({ path });
  }

  return {};
};

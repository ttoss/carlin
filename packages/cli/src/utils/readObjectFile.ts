/* eslint-disable import/no-dynamic-require */
/* eslint-disable global-require */
/* eslint-disable @typescript-eslint/no-var-requires */
import fs from 'fs';
import yaml from 'js-yaml';

export const readYaml = ({ path }: { path: string }) => {
  const template = fs.readFileSync(path, 'utf8') || JSON.stringify({});
  return yaml.safeLoad(template);
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

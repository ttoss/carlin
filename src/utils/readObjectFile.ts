import fs from 'fs';
import yaml from 'js-yaml';

export const readYaml = ({ path }: { path: string }) => {
  try {
    const file = fs.readFileSync(path, 'utf8');
    return yaml.safeLoad(file);
  } catch {
    return {};
  }
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

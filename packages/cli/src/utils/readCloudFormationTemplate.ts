import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

import { CloudFormationTemplate, getSchema } from './cloudFormationTemplate';

type TagAndType = {
  tag: string;
  options: yaml.TypeConstructorOptions;
};

const getTypes = (): TagAndType[] => [
  {
    tag: `!SubString`,
    options: {
      kind: 'scalar',
      construct: (filePath: string) => {
        return fs
          .readFileSync(path.resolve(process.cwd(), filePath))
          .toString();
      },
    },
  },
];

/**
 * CloudFormation
 * @param param0
 */
export const readCloudFormationYamlTemplate = ({
  templatePath,
}: {
  templatePath: string;
}): CloudFormationTemplate => {
  const schema = getSchema(getTypes());
  const template = fs.readFileSync(templatePath).toString();
  const parsed = yaml.safeLoad(template, { schema });
  if (!parsed || typeof parsed === 'string') {
    throw new Error('Cannot parse CloudFormation template.');
  }
  return parsed as CloudFormationTemplate;
};

import * as React from 'react';

import { monorepoTemplates } from '../../../cli/src/monorepo/getConfigs';

import Code from './Code';

const MonorepoTemplates = () => {
  return (
    <>
      {monorepoTemplates
        .sort((a, b) =>
          `${a.dir}${a.templateName}`.localeCompare(
            `${b.dir}${b.templateName}`,
          ),
        )
        .map(({ content, dir, templateName }) => (
          <Code key={templateName} name={`${dir}/${templateName}`}>
            {content}
          </Code>
        ))}
    </>
  );
};

export default MonorepoTemplates;

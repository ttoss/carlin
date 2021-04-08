import * as React from 'react';

import { dumpToYamlCloudFormationTemplate } from 'carlin/dist/utils/cloudFormationTemplate';

import CodeBlock from '@theme/CodeBlock';

const Template = ({ json }) => {
  return (
    <div
      style={{
        fontSize: '1em',
        maxHeight: '800px',
        overflowY: 'auto',
        marginBottom: '32px',
        marginTop: '32px',
      }}
    >
      <CodeBlock className="yaml">
        {dumpToYamlCloudFormationTemplate(json)}
      </CodeBlock>
    </div>
  );
};

export default Template;

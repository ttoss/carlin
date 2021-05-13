import * as React from 'react';

import ThemeCodeBlock from '@theme/CodeBlock';

const Template = (props) => {
  return (
    <div
      style={{
        marginTop: '32px',
        fontSize: '0.9em',
        maxHeight: '600px',
        overflowY: 'auto',
      }}
    >
      <ThemeCodeBlock {...props} />
    </div>
  );
};

export default Template;

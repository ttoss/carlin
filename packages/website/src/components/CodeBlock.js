import * as React from 'react';

import ThemeCodeBlock from '@theme/CodeBlock';

const Template = (props) => {
  return (
    <div
      style={{
        marginBottom: '32px',
        marginTop: '32px',
        fontSize: '0.9em',
        maxHeight: '600px',
        overflowY: 'auto',
      }}
    >
      {/* <div> */}
      <ThemeCodeBlock {...props} />
      {/* </div> */}
    </div>
  );
};

export default Template;

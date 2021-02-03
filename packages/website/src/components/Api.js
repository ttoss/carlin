import * as React from 'react';

import CodeBlock from '@theme/CodeBlock';

const API = ({ api }) => {
  return <CodeBlock className="bash">{api}</CodeBlock>;
};

export default API;

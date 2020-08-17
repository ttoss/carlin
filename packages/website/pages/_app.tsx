import * as React from 'react';

import { MDXProvider, Components } from '@mdx-js/react';
import type { AppProps } from 'next/app';

import CodeBlock from '../components/CodeBlock';

const components: Components = {
  pre: (props) => <div {...props} />,
  code: (props) => <CodeBlock {...props} />,
};

const App = ({ Component, pageProps }: AppProps) => {
  return (
    <>
      <MDXProvider components={components}>
        <Component {...pageProps} />
      </MDXProvider>
    </>
  );
};

export default App;

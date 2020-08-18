import * as React from 'react';

import { MDXProvider, Components } from '@mdx-js/react';
import type { AppProps } from 'next/app';

import CodeBlock from '../components/CodeBlock';
import Layout from '../components/Layout';

const components: Components = {
  pre: (props) => <div {...props} />,
  code: (props) => <CodeBlock {...props} />,
};

const App = ({ Component, pageProps }: AppProps) => {
  return (
    <>
      <MDXProvider components={components}>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </MDXProvider>
    </>
  );
};

export default App;

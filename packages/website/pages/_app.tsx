import * as React from 'react';

import { MDXProvider, Components } from '@mdx-js/react';
import type { AppProps } from 'next/app';

import CodeBlock from '../components/CodeBlock';
import Layout from '../components/Layout';

import '../main.css';

const components: Components = {
  pre: (props) => <div {...props} />,
  code: (props) => <CodeBlock {...props} />,
};

const App = ({ Component, pageProps }: AppProps) => {
  return (
    <>
      <Layout>
        <MDXProvider components={components}>
          <Component {...pageProps} />
        </MDXProvider>
      </Layout>
    </>
  );
};

export default App;

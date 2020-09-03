import type { AppProps } from 'next/app';
import { ThemeProvider } from 'theme-ui';

import CodeBlock from '../components/CodeBlock';
import Layout from '../components/Layout';

import 'typeface-asap';
import 'typeface-overpass';
import 'typeface-overpass-mono';

import theme from '../theme';

const components = {
  pre: ({ children }: any) => <>{children}</>,
  code: CodeBlock,
};

/**
 * ThemeProvides does not recognize "components" as props.
 */
const ThemeProviderAny = ThemeProvider as any;

const App = ({ Component, pageProps }: AppProps) => {
  return (
    <ThemeProviderAny theme={theme} components={components}>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </ThemeProviderAny>
  );
};

export default App;

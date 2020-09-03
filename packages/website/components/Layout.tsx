/** @jsx jsx */
import Link from 'next/link';
import { Container, Styled, jsx } from 'theme-ui';

import { commands } from '../api/commands';

const Layout: React.FC = ({ children }) => {
  return (
    <>
      <header sx={{ padding: 2 }}>Carlin</header>
      <div sx={{ display: 'flex', padding: 4 }}>
        <aside
          sx={{
            paddingX: 3,
            display: 'flex',
            flexDirection: 'column',
            alignContent: 'center',
            minWidth: ['fit-content'],
            width: ['fit-content'],
          }}
        >
          <span>
            <strong>Getting Started</strong>
          </span>
          <Link href="/docs/getting-started">
            <Styled.a>Getting Stated</Styled.a>
          </Link>
          <span>
            <strong>Usage</strong>
          </span>
          <Link href="/docs/usage/deploy-static-app">
            <Styled.a>deploy static-app</Styled.a>
          </Link>
          <span>
            <strong>API</strong>
          </span>
          {commands.map((command) => (
            <Link
              key={command}
              href="/docs/api/[command]"
              as={`/docs/api/${command}`}
            >
              <span className="text-blue-500 hover:text-blue-800 cursor-pointer">
                {command}
              </span>
            </Link>
          ))}
        </aside>
        <Container as="main" sx={{ maxWidth: '48em' }}>
          {children}
        </Container>
      </div>
    </>
  );
};

export default Layout;

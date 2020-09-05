/** @jsx jsx */
import Link from 'next/link';
import { Container, jsx } from 'theme-ui';

import { commands } from '../api/commands';

import Footer from './Footer';
import Header from './Header';

const padding = [4];

const navs: Array<{
  group: string;
  links: Array<{
    name: string;
    href: string;
    as?: string;
  }>;
}> = [
  {
    group: 'Getting Started',
    links: [
      {
        name: 'Getting Started',
        href: '/docs/getting-started',
      },
    ],
  },
  {
    group: 'Usage',
    links: [
      {
        name: 'deploy static-app',
        href: '/docs/usage/deploy-static-app',
      },
    ],
  },
  {
    group: 'API',
    links: commands.map((command) => ({
      name: command,
      href: '/docs/api/[command]',
      as: `/docs/api/${command}`,
    })),
  },
];

const Aside = () => {
  return (
    <aside
      sx={{
        padding,
        display: 'flex',
        flexDirection: 'column',
        alignContent: 'center',
        minWidth: ['fit-content'],
        width: ['fit-content'],
        borderRightColor: 'gray',
        borderRightStyle: [0],
        borderRightWidth: 0,
      }}
    >
      {navs.map(({ group, links }) => {
        return (
          <nav
            key={group}
            sx={{ display: 'flex', flexDirection: 'column', marginBottom: 3 }}
          >
            <span sx={{ fontSize: 3, fontWeight: 'bold', marginBottom: 0 }}>
              {group}
            </span>
            {links.map(({ name, href, as }) => {
              return (
                <Link key={name} href={href} as={as}>
                  <span sx={{ color: 'blue', cursor: 'pointer' }}>{name}</span>
                </Link>
              );
            })}
          </nav>
        );
      })}
    </aside>
  );
};

const Layout: React.FC = ({ children }) => {
  return (
    <>
      <Header />
      <div sx={{ display: 'flex' }}>
        <Aside />
        <Container as="main" sx={{ maxWidth: '60em', padding }}>
          {children}
        </Container>
      </div>
      <Footer />
    </>
  );
};

export default Layout;

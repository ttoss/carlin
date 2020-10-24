/** @jsx jsx */
import Link from 'next/link';
import { Container, jsx } from 'theme-ui';

import { commands } from '../api/commands';

import Footer from './Footer';
import Header from './Header';
import MaxWidth from './MaxWidth';

const padding = [3];

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
        name: 'deploy',
        href: '/docs/usage/deploy',
      },
      {
        name: 'deploy static-app',
        href: '/docs/usage/deploy-static-app',
      },
      {
        name: 'deploy lambda-layer',
        href: '/docs/usage/deploy-lambda-layer',
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
        paddingRight: padding,
        display: 'flex',
        flexDirection: 'column',
        alignContent: 'center',
        minWidth: ['fit-content'],
        width: ['fit-content'],
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
      <MaxWidth>
        <div sx={{ display: 'flex', paddingY: padding }}>
          <Aside />
          <Container as="main" sx={{ paddingLeft: padding }}>
            {children}
          </Container>
        </div>
      </MaxWidth>
      <Footer />
    </>
  );
};

export default Layout;

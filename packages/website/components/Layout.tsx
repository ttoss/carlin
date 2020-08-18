import * as React from 'react';

import Link from 'next/link';

import { commands } from '../api/commands';

const Layout: React.FC = ({ children }) => {
  return (
    <div style={{ display: 'flex' }}>
      <aside style={{ display: 'flex', flexDirection: 'column' }}>
        <span>
          <strong>API</strong>
        </span>
        {commands.map((command) => (
          <Link
            key={command}
            href="/docs/api/[command]"
            as={`/docs/api/${command}`}
          >
            <a>{command}</a>
          </Link>
        ))}
      </aside>
      <main>{children}</main>
    </div>
  );
};

export default Layout;

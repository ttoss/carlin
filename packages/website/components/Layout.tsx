import * as React from 'react';

import Link from 'next/link';

import { commands } from '../api/commands';

const Layout: React.FC = ({ children }) => {
  return (
    <>
      <header className="bg-blue-500 p-5">Carlin</header>
      <div className="flex bg-gray-200">
        <aside className="flex flex-col content-center w-2/12">
          <span>
            <strong>Usage</strong>
          </span>
          <Link href="/docs/usage/deploy-static-app">
            <span className="text-blue-500 hover:text-blue-800 cursor-pointer">
              deploy static-app
            </span>
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
        <main className="prose w-full max-w-none">{children}</main>
      </div>
    </>
  );
};

export default Layout;

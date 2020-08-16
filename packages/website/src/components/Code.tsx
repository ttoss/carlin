import * as React from 'react';

const Code: React.FC<{ name?: string }> = ({ children, name }) => {
  return (
    <>
      {name && (
        <ul>
          <li>
            <code>{name}</code>
          </li>
        </ul>
      )}
      <pre>
        <code>{children}</code>
      </pre>
    </>
  );
};

export default Code;

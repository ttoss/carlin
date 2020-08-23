/* eslint-disable react/no-array-index-key */
import React from 'react';

import Highlight, { defaultProps } from 'prism-react-renderer';
import dracula from 'prism-react-renderer/themes/dracula';

const CodeBlock = ({ children, className = 'sh' }: any) => {
  const language = (className || 'sh').replace(/language-/, '');

  return (
    <Highlight
      {...defaultProps}
      theme={dracula}
      code={children.trim()}
      language={language}
    >
      {({
        className: highlightClassName,
        style,
        tokens,
        getLineProps,
        getTokenProps,
      }) => (
        <pre
          className={highlightClassName}
          style={{
            ...style,
            padding: '20px',
            overflow: 'auto',
          }}
        >
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line, key: i })} className="pt-1">
              {line.map((token, key) => (
                <span key={key} {...getTokenProps({ token, key })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  );
};

export default CodeBlock;

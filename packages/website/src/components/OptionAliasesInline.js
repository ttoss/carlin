import * as React from 'react';

import Link from '@docusaurus/Link';

const Wrapper = ({ children, to }) => {
  if (to) {
    return <Link to={to}>{children}</Link>;
  }

  return <>{children}</>;
};

const OptionAliasesInline = ({ option, options, to }) => {
  const { alias } = options[option];

  const words = (() => {
    if (!alias) {
      return [option];
    }

    if (Array.isArray(alias)) {
      return [option, ...alias];
    }

    return [option, alias];
  })();

  return (
    <Wrapper to={to}>
      <code>
        {words.map((word, index, arr) => {
          const hyphens = word.length === 1 ? '-' : '--';
          return (
            <span key={word}>
              <span style={{ whiteSpace: 'nowrap' }}>
                {`${hyphens}${word}`}
              </span>
              {index !== arr.length - 1 && <span>{', '}</span>}
            </span>
          );
        })}
      </code>
    </Wrapper>
  );
};

export default OptionAliasesInline;

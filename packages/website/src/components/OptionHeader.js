import * as React from 'react';

import OptionAliasesInline from './OptionAliasesInline';

const OptionHeader = ({ options, option }) => {
  const values = options[option];
  const description = values.description || values.describe;
  const type = (() => {
    if (!values.type) {
      return 'object';
    }
    return values.type;
  })();

  return (
    <>
      <ul>
        <li>
          Aliases: <OptionAliasesInline options={options} option={option} />
        </li>
        <li>
          Type: <code>{type}</code>
        </li>
        <li>
          Default: <code>{JSON.stringify(values.default) || 'undefined'}</code>
        </li>
      </ul>
      {description && <p style={{ fontStyle: 'italic' }}>{description}</p>}
    </>
  );
};

export default OptionHeader;

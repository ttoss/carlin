import * as React from 'react';

const OptionAliasesInline = ({ option, options }) => {
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

  const inline = words
    .map((word) => {
      const hyphens = word.length === 1 ? '-' : '--';
      return `${hyphens}${word}`;
    })
    .join(', ');

  return <code>{inline}</code>;
};

export default OptionAliasesInline;

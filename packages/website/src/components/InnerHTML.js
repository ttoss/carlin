import * as React from 'react';

const InnerHTML = ({ html }) => {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
};

export default InnerHTML;

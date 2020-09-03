import * as React from 'react';

import { GetStaticProps } from 'next';

export const getStaticProps: GetStaticProps = async () => {
  const a = 'a';

  return {
    props: {
      a,
    },
  };
};

const Index = ({ a }: any) => {
  return <span className="bg-blue-800">{a}</span>;
};

export default Index;

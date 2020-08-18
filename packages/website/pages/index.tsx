import * as React from 'react';

import { GetStaticProps } from 'next';

import { getHelpText } from '../api/getHelpText';

export const getStaticProps: GetStaticProps = async () => {
  const a = await getHelpText('deploy');

  return {
    props: {
      a,
    },
  };
};

const Index = ({ a }: any) => {
  return <span>{a}</span>;
};

export default Index;

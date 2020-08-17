import * as React from 'react';

import { GetStaticPaths, GetStaticProps } from 'next';
import querystring from 'querystring';

import { commands, getHelpText } from '../../../api';
import CodeBlock from '../../../components/CodeBlock';

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: commands.map((command) => ({
      params: { command: querystring.escape(command) },
    })),
    fallback: false,
  };
};

type Props = {
  helpText: string;
};

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const command = (params?.command as string) || '';
  const helpText = await getHelpText(command);
  return { props: { helpText } };
};

const Index = ({ helpText }: Props) => {
  return <CodeBlock>{helpText}</CodeBlock>;
};

export default Index;

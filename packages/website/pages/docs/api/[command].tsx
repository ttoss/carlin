import * as React from 'react';

import { GetStaticPaths, GetStaticProps } from 'next';

import { commands } from '../../../api/commands';
import { getHelpText } from '../../../api/getHelpText';
import CodeBlock from '../../../components/CodeBlock';

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: [
      ...commands,
      ...commands.map((command) => command.replace(/ /g, '%20')),
    ].map((command) => ({ params: { command } })),
    fallback: false,
  };
};

type Props = {
  helpText: string;
};

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const command = (params?.command as string).replace(/%20/g, ' ') || '';
  const helpText = await getHelpText(command);
  return { props: { helpText } };
};

const DocsApiCommand = ({ helpText }: Props) => {
  return <CodeBlock>{helpText}</CodeBlock>;
};

export default DocsApiCommand;

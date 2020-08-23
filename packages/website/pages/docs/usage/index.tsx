import * as React from 'react';

import { GetStaticProps } from 'next';

import { getStaticAppTemplateYaml } from '../../../api/getTemplates';
import CodeBlock from '../../../components/CodeBlock';

type Props = {
  template: string;
};

export const getStaticProps: GetStaticProps<Props> = async () => {
  const template = getStaticAppTemplateYaml({
    cloudfront: true,
    spa: false,
  });
  return { props: { template } };
};

const Index = ({ template }: Props) => {
  return <CodeBlock className="yml">{template}</CodeBlock>;
};

export default Index;

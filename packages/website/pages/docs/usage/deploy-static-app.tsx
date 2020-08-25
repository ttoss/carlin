import * as React from 'react';

import { GetStaticProps } from 'next';

import {
  getJsonYamlTemplates,
  getStaticAppTemplate,
  JsonYamlTemplates,
} from '../../../api/getTemplates';

import CodeBlock from '../../../components/CodeBlock';

type Props = {
  onlyS3Template: JsonYamlTemplates;
};

type StaticAppTemplateParams = Parameters<typeof getStaticAppTemplate>[0];

export const getStaticProps: GetStaticProps<Props> = async () => {
  const mapParameters: { [key in keyof Props]: StaticAppTemplateParams } = {
    onlyS3Template: { cloudfront: false, spa: false },
  };

  const props = Object.entries(mapParameters).reduce<Props>(
    (acc, [key, params]) => {
      return {
        ...acc,
        [key]: getJsonYamlTemplates(getStaticAppTemplate(params)),
      };
    },
    {} as Props,
  );

  return { props };
};

const DocsUsageDeployStaticApp = ({ onlyS3Template }: Props) => {
  return (
    <article>
      <h1>Deploy Static App</h1>
      <section>
        <h2>Only S3 Bucket</h2>
        <CodeBlock className="sh">carlin deploy static-app</CodeBlock>
        <p>
          This deploy creates a single bucket to host de static files. The
          template created is shown below:
        </p>
        <CodeBlock className="yml">{onlyS3Template.templateYaml}</CodeBlock>
      </section>
    </article>
  );
};

export default DocsUsageDeployStaticApp;

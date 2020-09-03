import { GetStaticProps } from 'next';
import { Styled } from 'theme-ui';

import { getMethodComment } from '../../../api/getMethodComment';
import {
  getJsonYamlTemplates,
  getStaticAppTemplate,
  JsonYamlTemplates,
} from '../../../api/getTemplates';

import CodeBlock from '../../../components/CodeBlock';

type Templates = {
  onlyS3Template: JsonYamlTemplates;
};

type Props = {
  comments: any;
  templates: Templates;
};

type StaticAppTemplateParams = Parameters<typeof getStaticAppTemplate>[0];

export const getStaticProps: GetStaticProps<Props> = async () => {
  const mapTemplateParameters: {
    [key in keyof Props['templates']]: StaticAppTemplateParams;
  } = {
    onlyS3Template: { cloudfront: false, spa: false },
  };

  const templates = Object.entries(mapTemplateParameters).reduce<Templates>(
    (acc, [key, params]) => {
      return {
        ...acc,
        [key]: getJsonYamlTemplates(getStaticAppTemplate(params)),
      };
    },
    {} as Templates,
  );

  return {
    props: {
      templates,
      comments: getMethodComment({
        method: 'deployStaticApp',
        pathFromDist: 'deploy/staticApp/staticApp.js',
      }),
    },
  };
};

const DocsUsageDeployStaticApp = ({
  templates: { onlyS3Template },
  comments,
}: Props) => {
  return (
    <article>
      <Styled.h1>Deploy Static App</Styled.h1>
      <CodeBlock>carlin deploy static-app</CodeBlock>
      <Styled.p>
        <span>When you execute </span>
        <Styled.code>deploy static app</Styled.code>
        <span>, these steps are performed:</span>
      </Styled.p>
      <CodeBlock>{comments}</CodeBlock>
      <section>
        <Styled.h2>Only S3 Bucket</Styled.h2>
        <Styled.p>
          This deploy creates a single bucket to host de static files. The
          template created is shown below:
        </Styled.p>
        <CodeBlock className="yaml">{onlyS3Template.templateYaml}</CodeBlock>
      </section>
    </article>
  );
};

export default DocsUsageDeployStaticApp;

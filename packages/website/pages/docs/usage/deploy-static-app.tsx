import { Styled } from 'theme-ui';

import { getComments } from '../../../api/getComments';
import {
  getJsonYamlTemplates,
  getStaticAppTemplate,
  JsonYamlTemplates,
} from '../../../api/getTemplates';
import * as apiVars from '../../../api/vars';

import CodeBlock from '../../../components/CodeBlock';

export const getStaticProps = async () => {
  const comments = getComments({
    deployStaticApp: 'deploy/staticApp/staticApp.js',
    getLambdaEdgeOriginResponseZipFile:
      'deploy/staticApp/staticApp.template.js',
    originCacheExpression: 'deploy/staticApp/staticApp.template.js',
  });

  const templates = (() => {
    const mapTemplateParameters = {
      onlyS3: { cloudfront: false, spa: false },
      cloudfront: { cloudfront: true, spa: false },
    };

    return Object.entries(mapTemplateParameters).reduce<
      {
        [key in keyof typeof mapTemplateParameters]: JsonYamlTemplates;
      }
    >((acc, [key, params]) => {
      return {
        ...acc,
        [key]: getJsonYamlTemplates(getStaticAppTemplate(params)),
      };
    }, {} as any);
  })();

  const vars = {
    ...apiVars,
    getLambdaEdgeOriginResponseZipFile: apiVars.getLambdaEdgeOriginResponseZipFile(
      {
        spa: false,
      },
    ),
  };

  return { props: { templates, comments, vars } };
};

type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;

type Props = ThenArg<ReturnType<typeof getStaticProps>>['props'];

const DocsUsageDeployStaticApp = ({ templates, comments, vars }: Props) => {
  return (
    <article>
      <Styled.h1>deploy static-app</Styled.h1>
      <section>
        <CodeBlock>carlin deploy static-app</CodeBlock>
        <Styled.p>
          <span>When you execute </span>
          <Styled.code>deploy static app</Styled.code>
          <span>, these steps are performed:</span>
        </Styled.p>
        <CodeBlock>{comments.deployStaticApp}</CodeBlock>
      </section>
      <section>
        <Styled.h2>Only S3 Bucket</Styled.h2>
        <Styled.p>
          This deploy creates a single bucket to host de static files. The
          template created is shown below:
        </Styled.p>
        <CodeBlock className="yaml">{templates.onlyS3.templateYaml}</CodeBlock>
      </section>
      <section>
        <Styled.h2>CloudFront</Styled.h2>
        <Styled.p>
          Besides creating a S3 bucket, this deploy also add CloudFront to
          deployment. Lambda@Edge is used together with CloudFront whose
          functionality is explained below:
        </Styled.p>
        <CodeBlock className="js">
          {[
            comments.getLambdaEdgeOriginResponseZipFile,
            '\n',
            comments.originCacheExpression,
            `const originCacheExpression = ${vars.originCacheExpression}`,
          ].join('\n')}
        </CodeBlock>
        <Styled.p>The Lambda@Edge code is show below:</Styled.p>
        <CodeBlock className="js">
          {vars.getLambdaEdgeOriginResponseZipFile}
        </CodeBlock>
        <Styled.p>The CloudFormation template created is shown below:</Styled.p>
        <CodeBlock className="yaml">
          {templates.cloudfront.templateYaml}
        </CodeBlock>
      </section>
    </article>
  );
};

export default DocsUsageDeployStaticApp;

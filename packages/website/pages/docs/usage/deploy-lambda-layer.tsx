import { Styled } from 'theme-ui';

import { getComments } from '../../../api/getComments';
import { getJsonYamlTemplates } from '../../../api/getTemplates';
import { getLambdaLayerTemplate } from '../../../api/vars';

import CodeBlock from '../../../components/CodeBlock';

export const getStaticProps = async () => {
  const root = {
    comments: getComments({
      deployLambdaLayer: 'deploy/lambdaLayer.js',
      getLambdaLayerTemplate: 'deploy/lambdaLayer.js',
    }),
  };

  const lambdaLayerTemplateYaml = getJsonYamlTemplates(getLambdaLayerTemplate())
    .templateYaml;

  return { props: { root, lambdaLayerTemplateYaml } };
};

type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;

type Props = ThenArg<ReturnType<typeof getStaticProps>>['props'];

const DocsUsageDeployStaticApp = ({ root, lambdaLayerTemplateYaml }: Props) => {
  return (
    <article>
      <Styled.h1>deploy lambda-layer</Styled.h1>
      <section>
        <CodeBlock>carlin deploy lambda-layer</CodeBlock>
        <Styled.p>
          <span>When you execute </span>
          <Styled.code>deploy lambda-layer</Styled.code>
          <span>, these steps are performed:</span>
        </Styled.p>
        <CodeBlock>{root.comments.deployLambdaLayer}</CodeBlock>
      </section>
      <section>
        <Styled.p>
          <span>The CloudFormation template created (in this example, </span>
          <Styled.code>Description </Styled.code>
          <span>
            fields were created using the dependencies of this website):
          </span>
        </Styled.p>
        <CodeBlock className="sh">
          {root.comments.getLambdaLayerTemplate}
        </CodeBlock>
        <CodeBlock className="yaml">{lambdaLayerTemplateYaml}</CodeBlock>
      </section>
      {/* <Styled.h2>Usage</Styled.h2>
      <section>
        <Styled.h3>Only S3 Bucket</Styled.h3>
        <Styled.p>
          This deploy creates a single bucket to host de static files. The
          template created is shown below:
        </Styled.p>
        <CodeBlock className="yaml">{onlyS3.template.templateYaml}</CodeBlock>
      </section>
      <section>
        <Styled.h3>CloudFront</Styled.h3>
        <Styled.p>
          Besides creating a S3 bucket, this deploy also add CloudFront to
          deployment. Lambda@Edge is used together with CloudFront whose
          functionality is explained below:
        </Styled.p>
        <CodeBlock className="js">
          {[
            cloudfront.comments.getLambdaEdgeOriginResponseZipFile,
            '\n',
            cloudfront.comments.originCacheExpression,
            `const originCacheExpression = '${cloudfront.originCacheExpression}';`,
          ].join('\n')}
        </CodeBlock>
        <Styled.p>The Lambda@Edge code is show below:</Styled.p>
        <CodeBlock className="js">
          {cloudfront.getLambdaEdgeOriginResponseZipFile}
        </CodeBlock>
        <Styled.p>
          <span>The Lambda@Edge code with custom SCP </span>
          <Styled.code>{cloudfront.customScp}</Styled.code>
          <span> is show below:</span>
        </Styled.p>
        <CodeBlock className="js">
          {cloudfront.getLambdaEdgeOriginResponseZipFileWithScp}
        </CodeBlock>
        <Styled.p>The CloudFormation template created is shown below:</Styled.p>
        <CodeBlock className="yaml">
          {cloudfront.template.templateYaml}
        </CodeBlock> */}
      {/* </section> */}
    </article>
  );
};

export default DocsUsageDeployStaticApp;

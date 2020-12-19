import { Styled } from 'theme-ui';

import { getComments } from '../../../api/getComments';
import { getJsonYamlTemplates } from '../../../api/getTemplates';
import * as apiVars from '../../../api/vars';

import CodeBlock from '../../../components/CodeBlock';

export const getStaticProps = async () => {
  const root = {
    comments: getComments({
      deployStaticApp: 'deploy/staticApp/staticApp.js',
    }),
  };

  const onlyS3 = (() => {
    const options = { cloudfront: false, spa: false };
    const template = getJsonYamlTemplates(
      apiVars.getStaticAppTemplate(options),
    );
    return { options, template };
  })();

  const cloudfront = (() => {
    const options = {
      cloudfront: true,
      spa: false,
      scp: { 'some-src': "'some text'" },
    };
    const template = getJsonYamlTemplates(
      apiVars.getStaticAppTemplate(options),
    );
    const comments = getComments({
      getLambdaEdgeOriginResponseZipFile:
        'deploy/staticApp/staticApp.template.js',
      originCacheExpression: 'deploy/staticApp/staticApp.template.js',
    });
    const getLambdaEdgeOriginResponseZipFile = apiVars.getLambdaEdgeOriginResponseZipFile(
      options,
    );
    const getLambdaEdgeOriginResponseZipFileWithScp = apiVars.getLambdaEdgeOriginResponseZipFile();
    return {
      options,
      template,
      comments,
      getLambdaEdgeOriginResponseZipFile,
      getLambdaEdgeOriginResponseZipFileWithScp,
    };
  })();

  return { props: { root, onlyS3, cloudfront } };
};

type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;

type Props = ThenArg<ReturnType<typeof getStaticProps>>['props'];

const DocsUsageDeployStaticApp = ({ root, onlyS3, cloudfront }: Props) => {
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
        <CodeBlock>{root.comments.deployStaticApp}</CodeBlock>
      </section>
      <Styled.h2>Usage</Styled.h2>
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
          {[cloudfront.comments.getLambdaEdgeOriginResponseZipFile].join('\n')}
        </CodeBlock>
        <Styled.p>The Lambda@Edge code is show below:</Styled.p>
        <CodeBlock className="js">
          {cloudfront.getLambdaEdgeOriginResponseZipFile}
        </CodeBlock>
        {/* <Styled.p>
          <span>The Lambda@Edge code with custom SCP </span>
          <Styled.code>{cloudfront.customScp}</Styled.code>
          <span> is show below:</span>
        </Styled.p> */}
        <CodeBlock className="js">
          {cloudfront.getLambdaEdgeOriginResponseZipFileWithScp}
        </CodeBlock>
        <Styled.p>The CloudFormation template created is shown below:</Styled.p>
        <CodeBlock className="yaml">
          {cloudfront.template.templateYaml}
        </CodeBlock>
      </section>
    </article>
  );
};

export default DocsUsageDeployStaticApp;

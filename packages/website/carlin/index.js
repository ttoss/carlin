const yaml = require('js-yaml');

/* eslint-disable global-require */
const config = require('carlin/dist/config');

const cli = require('carlin/dist/cli').default;

const {
  baseStackTemplate,
} = require('carlin/dist/deploy/baseStack/deployBaseStack');

const { defaultTemplatePaths } = require('carlin/dist/deploy/cloudFormation');

const {
  getStaticAppTemplate,
} = require('carlin/dist/deploy/staticApp/staticApp.template');

const {
  getBuildSpec,
  getCodeBuildTemplate,
} = require('carlin/dist/deploy/lambdaLayer/codebuild.template');

const {
  getLambdaLayerTemplate,
} = require('carlin/dist/deploy/lambdaLayer/deployLambdaLayer');

const { getComment, getComments, toHtml } = require('./comments');

const cliApi = async (cmd) =>
  new Promise((resolve) => {
    cli().parse(cmd, { help: true }, (_, __, output) => {
      resolve(output);
    });
  });

module.exports = () => {
  return {
    name: 'carlin',
    loadContent: async () => {
      return {
        defaultTemplatePaths,
        api: {
          deploy: await cliApi('deploy'),
          deployStaticApp: await cliApi('deploy static-app'),
          deployLambdaLayer: await cliApi('deploy lambda-layer'),
        },
        comments: {
          ...getComments({
            deploy: ['deploy/cloudFormation.js', 'deploy'],
            deployCloudFormationDeployLambdaCode: [
              'deploy/cloudFormation.js',
              'deployCloudFormation~deployCloudFormationDeployLambdaCode',
            ],
            deployBaseStack: [
              'deploy/baseStack/deployBaseStack.js',
              'deployBaseStack',
            ],
            deployLambdaCode: ['deploy/lambda.js', 'deployLambdaCode'],
            deployStaticApp: [
              'deploy/staticApp/staticApp.js',
              'deployStaticApp',
            ],
            destroy: ['deploy/cloudFormation.js', 'destroy'],
            publishLambdaVersionZipFile: [
              'deploy/staticApp/staticApp.template.js',
              'PUBLISH_LAMBDA_VERSION_ZIP_FILE',
            ],
            readObjectFile: ['utils/readObjectFile.js', 'readObjectFile'],
            assignSecurityHeaders: [
              'deploy/staticApp/staticApp.template.js',
              'assignSecurityHeaders',
            ],
            getPackageLambdaLayerStackName: [
              'deploy/lambdaLayer/deployLambdaLayer.js',
              'getPackageLambdaLayerStackName',
            ],
          }),
          stackName: toHtml(
            getComment(['deploy/stackName.js', 'getStackName']).split(
              'CAUTION!!!',
            )[0],
          ),
          stackNameWarning: toHtml(
            getComment(['deploy/stackName.js', 'getStackName']).split(
              'CAUTION!!!',
            )[1],
          ),
          staticAppLambdaEdgeOriginRequestDescription: toHtml(
            getComment([
              'deploy/staticApp/staticApp.template.js',
              'getLambdaEdgeOriginRequestZipFile',
            ]).split('## Algorithm')[0],
          ),
          staticAppLambdaEdgeOriginRequestAlgorithm: toHtml(
            getComment([
              'deploy/staticApp/staticApp.template.js',
              'getLambdaEdgeOriginRequestZipFile',
            ]).split('## Algorithm')[1],
          ),
        },
        examples: {
          deploy: require('carlin/dist/deploy/command').examples,
        },
        lambdaLayer: {
          buildspec: getBuildSpec({ packageName: 'PACKAGE@X.Y.Z' }),
          buildspecCommands: yaml.dump(
            yaml.safeLoad(getBuildSpec({ packageName: 'PACKAGE@X.Y.Z' })).phases
              .install.commands,
          ),
          codeBuildProjectTemplate: getCodeBuildTemplate({
            baseBucketName: 'BASE_BUCKET_NAME',
          }),
          lambdaLayerTemplate: getLambdaLayerTemplate({
            bucket: 'BASE_BUCKET_NAME',
            key: 'lambda-layer/packages/PACKAGE@X.Y.Z.zip',
            packageName: 'PACKAGE@X.Y.Z.zip',
          }),
        },
        options: {
          cli: require('carlin/dist/cli').options,
          deploy: require('carlin/dist/deploy/command').options,
          deployStaticApp: require('carlin/dist/deploy/staticApp/command')
            .options,
          deployLambdaLayer: require('carlin/dist/deploy/lambdaLayer/command')
            .options,
        },
        templates: {
          baseStack: baseStackTemplate,
          staticAppOnlyS3: getStaticAppTemplate({}),
          staticAppCloudFront: getStaticAppTemplate({ cloudfront: true }),
          staticAppGtmId: getStaticAppTemplate({
            region: config.AWS_DEFAULT_REGION,
            cloudfront: true,
            gtmId: 'GTM-XXXX',
          }),
        },
      };
    },
    contentLoaded: async ({ actions, content }) => {
      const { createData } = actions;
      await createData('carlin.json', JSON.stringify(content));
    },
  };
};

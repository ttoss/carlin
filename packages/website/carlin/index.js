const fs = require('fs');
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
  getLambdaLayerBuilderTemplate,
} = require('carlin/dist/deploy/baseStack/getLambdaLayerBuilder.template');

const {
  getLambdaLayerTemplate,
} = require('carlin/dist/deploy/lambdaLayer/deployLambdaLayer');

const {
  getCicdTemplate,
  ECR_REPOSITORY_LOGICAL_ID,
} = require('carlin/dist/deploy/cicd/cicd.template');

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
      const s3 = {
        bucket: 'my-bucket',
        key: 'some-key',
        versionId: 'version-id',
      };

      return {
        defaultTemplatePaths,

        deployApi: await cliApi('deploy'),
        deployStaticAppApi: await cliApi('deploy static-app'),
        deployLambdaLayerApi: await cliApi('deploy lambda-layer'),

        ...getComments({
          deployComment: ['deploy/cloudFormation.core.js', 'deploy'],
          deployCloudFormationDeployLambdaCodeComment: [
            'deploy/cloudFormation.js',
            'deployCloudFormation~deployCloudFormationDeployLambdaCode',
          ],
          deployBaseStackComment: [
            'deploy/baseStack/deployBaseStack.js',
            'deployBaseStack',
          ],
          deployLambdaCodeComment: ['deploy/lambda.js', 'deployLambdaCode'],
          deployStaticAppComment: [
            'deploy/staticApp/staticApp.js',
            'deployStaticApp',
          ],
          removeOldVersionsComment: [
            'deploy/staticApp/staticApp.js',
            'removeOldVersions',
          ],
          destroyComment: ['deploy/cloudFormation.js', 'destroy'],
          publishLambdaVersionZipFileComment: [
            'deploy/staticApp/staticApp.template.js',
            'PUBLISH_LAMBDA_VERSION_ZIP_FILE',
          ],
          readObjectFileComment: ['utils/readObjectFile.js', 'readObjectFile'],
          assignSecurityHeadersComment: [
            'deploy/staticApp/staticApp.template.js',
            'assignSecurityHeaders',
          ],
          getPackageLambdaLayerStackNameComment: [
            'deploy/lambdaLayer/deployLambdaLayer.js',
            'getPackageLambdaLayerStackName',
          ],
          cliEnvComment: ['cli.js', 'getEnv'],
          cliGetConfigComment: ['cli.js', 'cli~getConfig'],
          cliGetPkgConfigComment: ['cli.js', 'getPkgConfig'],
          getCurrentBranchComment: [
            'utils/getCurrentBranch.js',
            'getCurrentBranch',
          ],
          getProjectNameComment: ['utils/getProjectName.js', 'getProjectName'],
          cicdTemplateGetEcrRepositoryComment: [
            'deploy/cicd/cicd.template.js',
            'getCicdTemplate~getEcrRepositoryResource',
          ],
        }),
        stackNameComment: toHtml(
          getComment(['deploy/stackName.js', 'getStackName']).split(
            'CAUTION!!!',
          )[0],
        ),
        stackNameWarningComment: toHtml(
          getComment(['deploy/stackName.js', 'getStackName']).split(
            'CAUTION!!!',
          )[1],
        ),
        staticAppLambdaEdgeOriginRequestDescriptionComment: toHtml(
          getComment([
            'deploy/staticApp/staticApp.template.js',
            'getLambdaEdgeOriginRequestZipFile',
          ]).split('## Algorithm')[0],
        ),
        staticAppLambdaEdgeOriginRequestAlgorithmComment: toHtml(
          getComment([
            'deploy/staticApp/staticApp.template.js',
            'getLambdaEdgeOriginRequestZipFile',
          ]).split('## Algorithm')[1],
        ),

        deployExamples: require('carlin/dist/deploy/command').examples,

        lambdaLayerBuildspec: getBuildSpec(),
        lambdaLayerBuildspecCommands: yaml.dump(
          yaml.load(getBuildSpec({ packageName: 'PACKAGE@X.Y.Z' })).phases
            .install.commands,
        ),
        lambdaLayerCodeBuildProjectTemplate: getLambdaLayerBuilderTemplate(),
        lambdaLayerTemplate: getLambdaLayerTemplate({
          bucket: 'BASE_BUCKET_NAME',
          key: 'lambda-layer/packages/PACKAGE@X.Y.Z.zip',
          packageName: 'PACKAGE@X.Y.Z.zip',
        }),

        cliOptions: require('carlin/dist/cli').options,
        deployOptions: require('carlin/dist/deploy/command').options,
        deployStaticAppOptions: require('carlin/dist/deploy/staticApp/command')
          .options,
        deployLambdaLayerOptions: require('carlin/dist/deploy/lambdaLayer/command')
          .options,

        baseStackTemplate,
        staticAppOnlyS3Template: getStaticAppTemplate({}),
        staticAppCloudFrontTemplate: getStaticAppTemplate({
          cloudfront: true,
        }),
        staticAppGtmIdTemplate: getStaticAppTemplate({
          region: config.AWS_DEFAULT_REGION,
          cloudfront: true,
          gtmId: 'GTM-XXXX',
        }),
        carlinCicdConfig: yaml.load(
          fs.readFileSync('../../cicd/carlin.yml', 'utf-8'),
        ),
        ...(() => {
          const cicdTemplate = getCicdTemplate({ s3 });
          return {
            cicdTemplate,
            cicdTemplateEcrRepository:
              cicdTemplate.Resources[ECR_REPOSITORY_LOGICAL_ID],
          };
        })(),
      };
    },
    contentLoaded: async ({ actions, content }) => {
      const { createData } = actions;

      Object.entries(content).forEach(async ([key, value]) => {
        await createData(`${key}.json`, JSON.stringify({ [key]: value }));
      });
    },
  };
};

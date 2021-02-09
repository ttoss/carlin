/* eslint-disable global-require */
const { dumpToYamlCloudFormationTemplate } = require('carlin/dist/utils');

const {
  baseStackTemplate,
} = require('carlin/dist/deploy/baseStack/deployBaseStack');

const cli = require('carlin/dist/cli').default;

const { defaultTemplatePaths } = require('carlin/dist/deploy/cloudFormation');

const { getComment, getComments, toHtml } = require('./comments');

const cliApi = async (cmd) =>
  new Promise((resolve) => {
    cli.parse(cmd, { help: true }, (_, __, output) => {
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
            destroy: ['deploy/cloudFormation.js', 'destroy'],
            readObjectFile: ['utils/readObjectFile.js', 'readObjectFile'],
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
        },
        examples: {
          deploy: require('carlin/dist/deploy/command').examples,
        },
        options: {
          cli: require('carlin/dist/cli').options,
          deploy: require('carlin/dist/deploy/command').options,
        },
        templates: {
          baseStack: {
            json: baseStackTemplate,
            yaml: dumpToYamlCloudFormationTemplate(baseStackTemplate),
          },
        },
      };
    },
    contentLoaded: async ({ actions, content }) => {
      const { createData } = actions;
      await createData('carlin.json', JSON.stringify(content));
    },
  };
};

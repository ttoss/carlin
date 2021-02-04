/* eslint-disable global-require */
const { dumpToYamlCloudFormationTemplate } = require('carlin/dist/utils');

const {
  baseStackTemplate,
} = require('carlin/dist/deploy/baseStack/deployBaseStack');

const carlin = require('./carlin');
const { getComment, getComments, toHtml } = require('./comments');

module.exports = () => {
  return {
    name: 'carlin',
    loadContent: async () => {
      return {
        ...carlin,
        api: {
          deploy: await carlin.cliApi('deploy'),
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

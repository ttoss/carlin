const carlin = require('./carlin');
const { getComments } = require('./comments');

module.exports = () => {
  return {
    name: 'carlin',
    loadContent: async () => {
      return {
        ...carlin,
        api: {
          deploy: await carlin.cliApi('deploy'),
        },
        comments: getComments({
          deploy: ['deploy/cloudFormation.js', 'deploy'],
          deployCloudFormationDeployLambdaCode: [
            'deploy/cloudFormation.js',
            'deployCloudFormation~deployCloudFormationDeployLambdaCode',
          ],
          deployLambdaCode: ['deploy/lambda.js', 'deployLambdaCode'],
          destroy: ['deploy/cloudFormation.js', 'destroy'],
        }),
      };
    },
    contentLoaded: async ({ actions, content }) => {
      const { createData } = actions;
      await createData('carlin.json', JSON.stringify(content));
    },
  };
};

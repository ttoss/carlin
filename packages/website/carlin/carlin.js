const cli = require('carlin/dist/cli').default;

const cliApi = async (cmd) =>
  new Promise((resolve) => {
    cli.parse(cmd, { help: true }, (_, __, output) => {
      resolve(output);
    });
  });

const { defaultTemplatePaths } = require('carlin/dist/deploy/cloudFormation');

module.exports = { cliApi, defaultTemplatePaths };

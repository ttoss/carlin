const cli = require('carlin/dist/cli').default;
// const { options: deployOptions } = require('carlin/dist/deploy/command');

const cliApi = async (cmd) =>
  new Promise((resolve) => {
    cli.parse(cmd, { help: true }, (_, __, output) => {
      resolve(output);
    });
  });

const { defaultTemplatePaths } = require('carlin/dist/deploy/cloudFormation');

module.exports = { cliApi, defaultTemplatePaths };

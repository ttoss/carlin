import * as fs from 'fs';

export default {
  pipelines: ['main', 'tag', 'pr'],
  slackWebhookUrl:
    'https://hooks.slack.com/services/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',
  sshKey: './ssh-key',
  sshUrl: 'git@github.com:ttoss/carlin.git',
  taskEnvironment: [
    {
      name: 'NPM_TOKEN',
      value: fs.readFileSync('./npmtoken', 'utf-8'),
    },
  ],
};

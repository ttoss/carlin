import { secrets } from './secrets';

export default {
  pipelines: ['main', 'tag', 'pr'],
  slackWebhookUrl: secrets.slackWebhookUrl,
  sshKey: './ssh-key',
  sshUrl: 'git@github.com:ttoss/carlin.git',
  taskEnvironment: [
    {
      name: 'NPM_TOKEN',
      value: secrets.npmToken,
    },
  ],
};

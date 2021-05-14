import * as fs from 'fs';

export default {
  pipelines: ['tag'],
  sshKey: './ssh-key',
  sshUrl: 'git@github.com:ttoss/carlin.git',
  taskEnvironment: [
    {
      name: 'NPM_TOKEN',
      value: fs.readFileSync('./npmtoken', 'utf-8'),
    },
  ],
};

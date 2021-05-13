import * as fs from 'fs';

export default {
  pipelines: ['tag'],
  sshKey: './ssh-key',
  sshUrl: 'git@github.com:ttoss/carlin.git',
  taskEnvironment: [
    { Name: 'NPM_TOKEN', Value: fs.readFileSync('./npmtoken', 'utf-8') },
  ],
};

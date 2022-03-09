import { ScheduledHandler } from 'aws-lambda';

import { executeTasks } from './executeTasks';

export const imageUpdaterScheduleHandler: ScheduledHandler = async () => {
  const cicdConfig = process.env.CICD_CONFIG;

  if (!cicdConfig) {
    console.log('No CICD config found.');
    return;
  }

  const commands = [
    'set -e',
    'git status',
    'git fetch',
    'git pull origin main',
    'git rev-parse HEAD',
    'yarn global add carlin',
    'cd cicd',
    'echo $CICD_CONFIG > carlin.json',
    'cat carlin.json',
    `carlin deploy cicd -c carlin.json`,
  ];

  const response = await executeTasks({
    commands,
    cpu: '512',
    memory: '2048',
    taskEnvironment: [
      {
        name: 'CICD_CONFIG',
        value: cicdConfig,
      },
    ],
  });

  console.log(JSON.stringify(response, null, 2));
};

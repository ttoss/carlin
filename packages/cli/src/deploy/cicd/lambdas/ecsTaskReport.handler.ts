import { IncomingWebhook } from '@slack/webhook';
import { Handler } from 'aws-lambda';

import { putApprovalResultManualTask } from './putApprovalResultManualTask';

export const getEcsTaskLogsUrl = ({ ecsTaskArn }: { ecsTaskArn: string }) => {
  if (
    !process.env.ECS_TASK_CONTAINER_NAME ||
    !process.env.ECS_TASK_LOGS_LOG_GROUP
  ) {
    return undefined;
  }

  /**
   * Arn has the following format:
   * arn:aws:ecs:us-east-1:483684946879:task/CarlinCicdCarlinMonorepo-RepositoryTasksECSCluster-1J6saGT91hCr/6fcc78682de442ae89a0b7339ac7d981
   *
   * We want the "6fcc78682de442ae89a0b7339ac7d981" part.
   */
  const ecsTaskId = ecsTaskArn.split('/')[2];

  const ecsTaskLogsUrl = [
    /**
     * https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html#configuration-envvars-runtime
     */
    `https://console.aws.amazon.com/cloudwatch/home?region=${process.env.AWS_REGION}#logsV2:log-groups`,
    'log-group',
    process.env.ECS_TASK_LOGS_LOG_GROUP,
    'log-events',
    `ecs/${process.env.ECS_TASK_CONTAINER_NAME}/${ecsTaskId}`.replace(
      /\//g,
      '%252F',
    ),
  ].join('/');

  return ecsTaskLogsUrl;
};

export type Status = 'Approved' | 'Rejected';

export type Event = {
  status: Status;
  ecsTaskArn?: string;
  pipelineName?: string;
};

/**
 * This method is invoked when an ECS task is executed and the success or
 * failure commands calls `carlin cicd-ecs-task-report --status=<status>`.
 */
export const ecsTaskReportHandler: Handler<Event> = async ({
  ecsTaskArn,
  status,
  pipelineName,
}) => {
  const logs = ecsTaskArn && getEcsTaskLogsUrl({ ecsTaskArn });

  const handleApprovalResult = async () => {
    if (pipelineName) {
      await putApprovalResultManualTask({
        pipelineName,
        result: {
          status,
          summary: JSON.stringify({ status, logs }),
        },
      });
    }
  };

  const handleStackNotification = async () => {
    const url = process.env.SLACK_WEBHOOK_URL;

    if (!url) {
      return;
    }

    const webhook = new IncomingWebhook(url);

    /**
     * Block Kit Builder: https://app.slack.com/block-kit-builder/TJ79J0ZU3#%7B%22blocks%22:%5B%5D%7D
     * Formatting: https://api.slack.com/reference/surfaces/formatting
     */
    await webhook.send({
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `<${logs}|Logs>`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `\`\`\`${JSON.stringify(
              {
                status,
                pipelineName,
              },
              null,
              2,
            )}\`\`\``,
          },
        },
      ],
    });
  };

  await Promise.all([handleApprovalResult(), handleStackNotification()]);

  return { statusCode: 200, body: 'ok' };
};

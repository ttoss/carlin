import AWS from 'aws-sdk';
import { CommandModule, InferredOptionTypes } from 'yargs';

type Status = 'failure' | 'success';

/**
 * This method create the payload to send to Lambda ECS task report handler.
 *
 * @param param.status execution status.
 */
const sendEcsTaskReport = async ({ status }: { status: Status }) => {
  if (!process.env.ECS_TASK_REPORT_HANDLER_NAME) {
    return;
  }

  const lambda = new AWS.Lambda();

  const payload: any = { status };

  if (process.env.ECS_TASK_ARN) {
    payload.ecsTaskArn = process.env.ECS_TASK_ARN;
  }

  if (process.env.PIPELINE_JOB_ID) {
    payload.pipelineJobId = process.env.PIPELINE_JOB_ID;
  }

  await lambda
    .invokeAsync({
      FunctionName: process.env.ECS_TASK_REPORT_HANDLER_NAME,
      InvokeArgs: JSON.stringify(payload),
    })
    .promise();
};

const options = {
  status: {
    choices: ['failure', 'success'] as Status[],
    demandOption: true,
    type: 'string',
  },
} as const;

export const ecsTaskReportCommand: CommandModule<
  any,
  InferredOptionTypes<typeof options>
> = {
  command: 'cicd-ecs-task-report',
  describe: false,
  builder: (yargs) => yargs.options(options),
  handler: async (args) => {
    return sendEcsTaskReport(args as any);
  },
};

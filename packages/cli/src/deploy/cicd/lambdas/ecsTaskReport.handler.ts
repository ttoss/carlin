import { Handler } from 'aws-lambda';

export const ecsTaskReportHandler: Handler = async (event) => {
  console.log(event);

  return { statusCode: 200, body: 'ok' };
};

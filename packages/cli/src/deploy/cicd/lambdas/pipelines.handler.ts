import { Handler } from 'aws-lambda';

export const pipelinesHandler: Handler = async (event) => {
  console.log(event);
};

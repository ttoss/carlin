/* eslint-disable import/first */

// const webhooksOnErrorMock = jest.fn();

// const webhooksReceiveMock = jest.fn();

// jest.mock('@octokit/webhooks', () => ({
//   Webhooks: jest.fn().mockReturnValue({
//     onError: webhooksOnErrorMock,
//     receive: webhooksReceiveMock,
//   }),
// }));

const putObjectMock = jest.fn().mockReturnValue({ promise: jest.fn() });

jest.mock('aws-sdk', () => ({
  ECS: jest.fn(),
  S3: jest.fn().mockReturnValue({
    putObject: putObjectMock,
  }),
}));

import {
  githubWebhooksApiV1Handler,
  webhooks,
} from './githubWebhooksApiV1.handler';

const context = {} as any;

const callback = jest.fn();

const handler = (event: any) =>
  githubWebhooksApiV1Handler(event, context, callback);

const xGitHubDelivery = 'xGitHubDelivery';

const xGitHubEvent = 'xGitHubEvent';

const xHubSignature = 'xHubSignature';

const webhooksReceiveMock = jest.spyOn(webhooks, 'receive');

beforeEach(() => {
  delete process.env.PIPELINES_JSON;
  delete process.env.TRIGGER_PIPELINES_OBJECT_KEY_PREFIX;
  delete process.env.BASE_STACK_BUCKET_NAME;

  webhooksReceiveMock.mockClear();
});

test('should call S3 putObject', async () => {
  process.env.PIPELINES_JSON = JSON.stringify(['main']);
  process.env.TRIGGER_PIPELINES_OBJECT_KEY_PREFIX = 'some/prefix';
  process.env.BASE_STACK_BUCKET_NAME = 'base-stack';

  const body = { ref: 'refs/heads/main' };

  const response: any = await handler({
    headers: {
      'X-GitHub-Delivery': xGitHubDelivery,
      'X-GitHub-Event': 'push',
      'X-Hub-Signature-256': xHubSignature,
    },
    body: JSON.stringify(body),
  });

  expect(putObjectMock).toHaveBeenCalledWith(
    expect.objectContaining({
      Body: expect.any(Buffer),
      Bucket: 'base-stack',
      Key: 'some/prefix/main.zip',
    }),
  );

  expect(response).toMatchObject({ body: '{"ok":true}', statusCode: 200 });
});

test('should throw process.env.BASE_STACK_BUCKET_NAME is not defined', async () => {
  process.env.PIPELINES_JSON = JSON.stringify(['main']);
  process.env.TRIGGER_PIPELINES_OBJECT_KEY_PREFIX = 'some/prefix';

  const body = { ref: 'refs/heads/main' };

  const response: any = await handler({
    headers: {
      'X-GitHub-Delivery': xGitHubDelivery,
      'X-GitHub-Event': 'push',
      'X-Hub-Signature-256': xHubSignature,
    },
    body: JSON.stringify(body),
  });

  expect(webhooksReceiveMock).toHaveBeenCalledWith({
    id: xGitHubDelivery,
    name: 'push',
    payload: body,
  });

  expect(response.statusCode).toBe(500);
  expect(response.body).toContain(
    'process.env.BASE_STACK_BUCKET_NAME is not defined.',
  );
});

test('should throw process.env.TRIGGER_PIPELINES_OBJECT_KEY_PREFIX is not defined', async () => {
  process.env.PIPELINES_JSON = JSON.stringify(['main']);

  const body = { ref: 'refs/heads/main' };

  const response: any = await handler({
    headers: {
      'X-GitHub-Delivery': xGitHubDelivery,
      'X-GitHub-Event': 'push',
      'X-Hub-Signature-256': xHubSignature,
    },
    body: JSON.stringify(body),
  });

  expect(webhooksReceiveMock).toHaveBeenCalledWith({
    id: xGitHubDelivery,
    name: 'push',
    payload: body,
  });

  expect(response.statusCode).toBe(500);
  expect(response.body).toContain(
    'process.env.TRIGGER_PIPELINES_OBJECT_KEY_PREFIX is not defined',
  );
});

test('should call webhook.receive properly', async () => {
  const body = { someProperty: 'someValue' };

  const response = await handler({
    headers: {
      'X-GitHub-Delivery': xGitHubDelivery,
      'X-GitHub-Event': xGitHubEvent,
      'X-Hub-Signature-256': xHubSignature,
    },
    body: JSON.stringify(body),
  });

  expect(webhooksReceiveMock).toHaveBeenCalledWith({
    id: xGitHubDelivery,
    name: xGitHubEvent,
    payload: body,
  });
  expect(response).toMatchObject({ body: '{"ok":true}', statusCode: 200 });
});

test("should return event.body doesn't exist", async () => {
  const response = await handler({});
  expect(response).toEqual({
    body: "event.body doesn't exist.",
    statusCode: 500,
  });
});

test("should return X-GitHub-Delivery doesn't exist", async () => {
  const response = await handler({ headers: {}, body: '{}' });
  expect(response).toEqual({
    body: "X-GitHub-Delivery doesn't exist.",
    statusCode: 500,
  });
});

test("should return X-GitHub-Event doesn't exist", async () => {
  const response = await handler({
    headers: { 'X-GitHub-Delivery': xGitHubDelivery },
    body: '{}',
  });
  expect(response).toEqual({
    body: "X-GitHub-Event doesn't exist.",
    statusCode: 500,
  });
});

test("should return X-Hub-Signature-256 or X-Hub-Signature doesn't exist", async () => {
  const response = await handler({
    headers: {
      'X-GitHub-Delivery': xGitHubDelivery,
      'X-GitHub-Event': xGitHubEvent,
    },
    body: '{}',
  });
  expect(response).toEqual({
    body: "X-Hub-Signature-256 or X-Hub-Signature doesn't exist.",
    statusCode: 500,
  });
});

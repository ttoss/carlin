import { Webhooks } from '@octokit/webhooks';
import AdmZip from 'adm-zip';
import { ProxyHandler } from 'aws-lambda';
import { S3 } from 'aws-sdk';

import { getTriggerPipelinesObjectKey } from '../getTriggerPipelineObjectKey';
import { Pipeline, getPrCommands, getClosedPrCommands } from '../pipelines';

import { executeTasks, shConditionalCommands } from './executeTasks';
import { getProcessEnvVariable } from './getProcessEnvVariable';

const s3 = new S3();

/**
 * When this file is placed, a CodePipeline pipeline is started.
 */
const putJobDetails = async ({
  pipeline,
  details,
}: {
  pipeline: Pipeline;
  details: any;
}) => {
  const zip = new AdmZip();

  const content = JSON.stringify(details, null, 2);

  zip.addFile(pipeline, Buffer.alloc(content.length + 1, content));

  return s3
    .putObject({
      Body: zip.toBuffer(),
      Bucket: getProcessEnvVariable('BASE_STACK_BUCKET_NAME'),
      Key: getTriggerPipelinesObjectKey(pipeline),
    })
    .promise();
};

export const githubWebhooksApiV1Handler: ProxyHandler = async (
  event,
  context,
) => {
  try {
    /**
     * Ends function immediately after callback.
     */
    context.callbackWaitsForEmptyEventLoop = false;

    const { body, headers } = event;

    if (!body) {
      throw new Error("event.body doesn't exist.");
    }

    const xGitHubDelivery = headers['X-GitHub-Delivery'];
    const xGitHubEvent = headers['X-GitHub-Event'];
    const xHubSignature =
      headers['X-Hub-Signature-256'] || headers['X-Hub-Signature'];

    if (!xGitHubDelivery) {
      throw new Error("X-GitHub-Delivery doesn't exist.");
    }

    if (!xGitHubEvent) {
      throw new Error("X-GitHub-Event doesn't exist.");
    }

    if (!xHubSignature) {
      throw new Error("X-Hub-Signature-256 or X-Hub-Signature doesn't exist.");
    }

    const webhooks = new Webhooks({ secret: '123' });

    const pipelines: Pipeline[] = JSON.parse(
      process.env.PIPELINES_JSON || JSON.stringify([]),
    );

    if (pipelines.includes('pr')) {
      webhooks.on(
        [
          'pull_request.opened',
          'pull_request.reopened',
          'pull_request.ready_for_review',
          'pull_request.synchronize',
        ],
        async ({ payload }) => {
          if (payload.pull_request.draft) {
            return;
          }

          await executeTasks({
            commands: [
              shConditionalCommands({
                conditionalCommands: getPrCommands({
                  branch: payload.pull_request.head.ref,
                }),
              }),
            ],
          });
        },
      );

      webhooks.on(['pull_request.closed'], async ({ payload }) => {
        /**
         * https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-cpu-memory-error.html
         */
        await executeTasks({
          cpu: '256',
          memory: '512',
          commands: [
            shConditionalCommands({
              conditionalCommands: getClosedPrCommands({
                branch: payload.pull_request.head.ref,
              }),
            }),
          ],
        });
      });
    }

    if (pipelines.includes('main')) {
      webhooks.on('push', async (details) => {
        if (details.payload.ref === 'refs/heads/main') {
          await putJobDetails({ pipeline: 'main', details });
        }
      });
    }

    if (pipelines.includes('tag')) {
      webhooks.on('push', async (details) => {
        if (details.payload.ref.startsWith('refs/tags/')) {
          await putJobDetails({ pipeline: 'tag', details });
        }
      });
    }

    webhooks.onError((onErrorEvent) => {
      console.error('Webhooks on error.');
      console.error(JSON.stringify(onErrorEvent, null, 2));
      throw onErrorEvent;
    });

    /**
     * Replace "receive" for "verifyAndReceive" when WebCrypto exist on Node.js
     * API.
     */
    await webhooks.receive({
      id: xGitHubDelivery,
      name: xGitHubEvent as any,
      // signature: xHubSignature,
      payload: JSON.parse(body),
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (error) {
    console.error(error);
    return { statusCode: error.status || 500, body: error.message };
  }
};

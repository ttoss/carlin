import { Webhooks } from '@octokit/webhooks';
import { ProxyHandler } from 'aws-lambda';

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

    // webhooks.on(['pull_request.ready_for_review'], () => {});

    webhooks.onAny((onAnyContext) => {
      console.log(onAnyContext);
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

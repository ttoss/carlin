import { API_LOGICAL_ID, getCicdTemplate } from './cicd.template';

describe('testing CICD template', () => {
  test('should have serverless API', async () => {
    const template = await getCicdTemplate({
      s3: {
        bucket: 'bucket',
        key: 'key',
        versionId: 'versionId',
      },
    });

    expect(template.Resources).toHaveProperty(API_LOGICAL_ID);
    expect(template.Resources[API_LOGICAL_ID].Type).toEqual(
      'AWS::Serverless::Api',
    );
  });
});

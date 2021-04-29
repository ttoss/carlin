import { API_LOGICAL_ID, getCicdTemplate } from './cicd.template';

describe('testing CICD template', () => {
  const template = getCicdTemplate();

  test('should have serverless API', () => {
    expect(template.Resources).toHaveProperty(API_LOGICAL_ID);
    expect(template.Resources[API_LOGICAL_ID].Type).toEqual(
      'AWS::Serverless::Api',
    );
  });
});

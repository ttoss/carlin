import { getStaticAppTemplate } from 'carlin/dist/deploy/staticApp/staticApp.template';
import { dumpCloudFormationTemplate } from 'carlin/dist/utils';

export const getStaticAppTemplateYaml = (
  args: Parameters<typeof getStaticAppTemplate>[0],
) => {
  return dumpCloudFormationTemplate(getStaticAppTemplate(args));
};

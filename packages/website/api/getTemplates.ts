import { dumpToYamlCloudFormationTemplate } from 'carlin/dist/utils';
import { CloudFormationTemplate } from 'carlin/dist/utils/cloudFormationTemplate';

export type JsonYamlTemplates = {
  templateJson: any;
  templateYaml: string;
};

export const getJsonYamlTemplates = (
  templateJson: CloudFormationTemplate,
): JsonYamlTemplates => {
  return {
    templateJson,
    templateYaml: dumpToYamlCloudFormationTemplate(templateJson),
  };
};

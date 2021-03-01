import yaml from 'js-yaml';

interface Parameter {
  AllowedValues?: string[];
  Default?: string | number;
  Description?: string;
  Type: string;
}

export interface Resource {
  Type: string;
  DeletionPolicy?: string;
  Description?: string;
  DependsOn?: string[];
  Condition?: string;
  Properties: any;
}

export type Output = {
  Description?: string;
  Value: string | any;
  Export?: {
    Name: string | any;
  };
};

export interface CloudFormationTemplate {
  AWSTemplateFormatVersion: '2010-09-09';
  Conditions?: any;
  Parameters?: { [key: string]: Parameter };
  Resources: { [key: string]: Resource };
  Outputs?: { [key: string]: Output };
}

interface TagAndType {
  tag: string;
  options: yaml.TypeConstructorOptions;
}

const cloudFormationTypes: TagAndType[] = [
  {
    tag: '!Equals',
    options: {
      kind: 'sequence',
      construct: (data: any) => {
        return { 'Fn::Equals': data };
      },
    },
  },
  {
    tag: '!FindInMap',
    options: {
      kind: 'sequence',
      construct: (data: any) => {
        return { 'Fn::FindInMap': data };
      },
    },
  },
  {
    tag: '!GetAtt',
    options: {
      kind: 'scalar',
      construct: (data: any) => {
        return { 'Fn::GetAtt': data.split('.') };
      },
    },
  },
  {
    tag: '!GetAtt',
    options: {
      kind: 'sequence',
      construct: (data: any) => {
        return { 'Fn::GetAtt': data };
      },
    },
  },
  {
    tag: '!If',
    options: {
      kind: 'sequence',
      construct: (data: any) => {
        return { 'Fn::If': data };
      },
    },
  },
  {
    tag: '!ImportValue',
    options: {
      kind: 'scalar',
      construct: (data: any) => {
        return { 'Fn::ImportValue': data };
      },
    },
  },
  {
    tag: '!Join',
    options: {
      kind: 'sequence',
      construct: (data: any) => {
        return { 'Fn::Join': data };
      },
    },
  },
  {
    tag: '!Not',
    options: {
      kind: 'sequence',
      construct: (data: any) => {
        return { 'Fn::Not': data };
      },
    },
  },
  {
    tag: '!Ref',
    options: {
      kind: 'scalar',
      construct: (data: any) => {
        return { Ref: data };
      },
    },
  },
  {
    tag: '!Sub',
    options: {
      kind: 'scalar',
      construct: (data: any) => {
        return { 'Fn::Sub': data };
      },
    },
  },
  {
    tag: '!Sub',
    options: {
      kind: 'sequence',
      construct: (data: any) => {
        return { 'Fn::Sub': data };
      },
    },
  },
];

const getYamlTypes = (tagAndTypeArr: TagAndType[]) =>
  tagAndTypeArr.map(({ tag, options }) => new yaml.Type(tag, options));

export const getSchema = (tagAndTypeArr: TagAndType[] = []) =>
  yaml.Schema.create(getYamlTypes([...tagAndTypeArr, ...cloudFormationTypes]));

export const dumpToYamlCloudFormationTemplate = (
  cloudFormationTemplate: CloudFormationTemplate,
) => yaml.safeDump(cloudFormationTemplate, { schema: getSchema() });

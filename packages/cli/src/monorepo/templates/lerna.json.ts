export const templateName = 'lerna.json';

export const dir = '.';

export const content = `
{
  "ignoreChanges": ["**/*.md"],
  "command": {
    "publish": {
      "allowBranch": "master",
      "conventionalCommits": true,
      "message": "chore: publish new version"
    },
    "version": {
      "forcePublish": true
    }
  },
  "npmClient": "yarn",
  "useWorkspaces": true,
  "version": "0.0.1",
  "stream": true
}
`;

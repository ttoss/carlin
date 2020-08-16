export const templateName = 'lerna.json';

export const dir = '.';

export const content = `
{
  "ignoreChanges": ["**/*.md", "**/package.json"],
  "command": {
    "publish": {
      "allowBranch": "master",
      "conventionalCommits": true,
      "message": "chore: publish new version"
    }
  },
  "npmClient": "yarn",
  "useWorkspaces": true,
  "version": "independent",
  "stream": true
}
`;

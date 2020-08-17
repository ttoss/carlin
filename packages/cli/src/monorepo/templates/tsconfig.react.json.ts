export const templateName = 'tsconfig.react.json';

export const dir = 'config';

export const content = `
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "target": "esnext",
    "lib": ["dom", "dom.iterable", "esnext"],
    "jsx": "react",
    "noEmit": true,
    "incremental": false
  }
}
`;

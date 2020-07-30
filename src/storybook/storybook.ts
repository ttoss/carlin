import storybook from '@storybook/react/standalone';
import fs from 'fs';
import path from 'path';
import log from 'npmlog';

import { exec } from '../utils/exec';

const STORYBOOK_CONFIG_DIR = './.storybook';
const STORYBOOK_PORT = 9009;

const logPrefix = 'storybook';

const isTypescript = () => {
  const tsConfigPath = path.resolve(process.cwd(), 'tsconfig.json');
  return fs.existsSync(tsConfigPath);
};

const config = (stories: string[]) => {
  return {
    stories,
    addons: [
      // '@storybook/addon-actions',
      // '@storybook/addon-a11y',
      // '@storybook/addon-knobs',
      // '@storybook/addon-viewport',
      {
        name: '@storybook/addon-docs',
        options: {
          configureJSX: true,
          sourceLoaderOptions: null,
        },
      },
    ],
    presets: [
      isTypescript() ? '@storybook/preset-typescript' : undefined,
      '@storybook/preset-create-react-app',
    ].filter((p) => !!p),
  };
};

const updateTsConfigFileSync = () => {
  const tsConfigPath = path.resolve(process.cwd(), 'tsconfig.json');
  if (!fs.existsSync(tsConfigPath)) {
    return;
  }
  const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath).toString());
  if (tsConfig?.compilerOptions) tsConfig.compilerOptions.noEmit = false;
  fs.writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2));
};

const createConfigDir = ({
  stories: storiesFolders,
}: {
  stories?: string[];
}) => {
  const stories = (storiesFolders || ['']).map((story) =>
    path.relative(
      path.resolve(process.cwd()),
      path.resolve('..', 'src', story, '**', '*.stories.(md|mdx|ts|tsx|js|jsx)')
    )
  );

  if (!fs.existsSync(STORYBOOK_CONFIG_DIR)) {
    fs.mkdirSync(STORYBOOK_CONFIG_DIR);
  }

  fs.writeFileSync(
    `${STORYBOOK_CONFIG_DIR}/main.js`,
    `module.exports = ${JSON.stringify(config(stories), null, 2)} ;`
  );

  if (
    fs.existsSync(
      path.resolve(STORYBOOK_CONFIG_DIR, '..', 'src', 'storybook.preview.tsx')
    )
  ) {
    fs.writeFileSync(
      `${STORYBOOK_CONFIG_DIR}/preview.tsx`,
      `import '../src/storybook.preview';`
    );
    return;
  }

  if (
    fs.existsSync(
      path.resolve(STORYBOOK_CONFIG_DIR, '..', 'src', 'storybook.preview.js')
    )
  ) {
    fs.writeFileSync(
      `${STORYBOOK_CONFIG_DIR}/preview.js`,
      `require('../src/storybook.preview');`
    );
    return;
  }

  log.info(
    logPrefix,
    'Preview not found.',
    "'storybook.preview.(tsx|js)' file was not found inside 'src' folder."
  );
};

const removeConfigDir = async () => {
  if (fs.existsSync(path.resolve(STORYBOOK_CONFIG_DIR))) {
    await exec(`rm -rf ${STORYBOOK_CONFIG_DIR}`);
  }
};

export const runStorybook = async ({ stories }: { stories?: string[] }) => {
  console.log('AA');
  process.env.NODE_ENV = 'development';
  await removeConfigDir();
  // updateTsConfigFileSync();
  createConfigDir({ stories });
  storybook({
    mode: 'dev',
    port: STORYBOOK_PORT,
    configDir: STORYBOOK_CONFIG_DIR,
  });
};

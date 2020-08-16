import { FileTemplate } from '../../utils';

import * as commitlintConfigJs from './commitlint.config.js';
import * as dotEslintignore from './dot-eslintignore';
import * as dotEslintrcJs from './dot-eslintrc.js';
import * as dotGitignore from './dot-gitignore';
import * as dotHuskyrcJs from './dot-huskyrc.js';
import * as dotPrettierrcJs from './dot-prettierrc.js';
import * as dotStylelintrcJs from './dot-stylelintrc.js';
import * as eslintrcBaseJs from './eslintrc.base.js';
import * as eslintrcReactJs from './eslintrc.react.js';
import * as fileMockJs from './fileMock.js';
import * as huskyConfigJs from './husky.config.js';
import * as jestConfigBaseJs from './jest.config.base.js';
import * as lernaJson from './lerna.json';
import * as lintStagedConfigJs from './lint-staged.config.js';
import * as prettierConfigJs from './prettier.config.js';
import * as styleMockJs from './styleMock.js';
import * as stylelintConfigJs from './stylelint.config.js';
import * as tsconfigBaseJson from './tsconfig.base.json';
import * as tsconfigReactJson from './tsconfig.react.json';

export const templates: FileTemplate[] = [
  commitlintConfigJs,
  dotEslintignore,
  dotEslintrcJs,
  dotGitignore,
  dotHuskyrcJs,
  dotPrettierrcJs,
  dotStylelintrcJs,
  eslintrcBaseJs,
  eslintrcReactJs,
  fileMockJs,
  huskyConfigJs,
  jestConfigBaseJs,
  lernaJson,
  lintStagedConfigJs,
  prettierConfigJs,
  styleMockJs,
  stylelintConfigJs,
  tsconfigBaseJson,
  tsconfigReactJson,
];

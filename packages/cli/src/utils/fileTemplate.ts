import fs from 'fs';
import log from 'npmlog';
import path from 'path';

const logPrefix = 'fileTemplate';

export type FileTemplate = {
  content: string;
  dir: string;
  templateName: string;
};

const writeFileTemplate = async ({
  content,
  templateName,
  dir,
}: FileTemplate) => {
  try {
    const newTemplateName = templateName.replace('dot-', '.');
    const fullWriteDir = path.resolve(process.cwd(), dir, newTemplateName);
    log.info(logPrefix, `Writing "${newTemplateName}"...`);
    /**
     * Create if it does not exist.
     */
    if (dir) {
      const dirFullPath = path.resolve(process.cwd(), dir);
      if (!fs.existsSync(dirFullPath)) {
        fs.mkdirSync(dirFullPath);
      }
    }
    await fs.promises.writeFile(fullWriteDir, content);
  } catch (error) {
    log.error(logPrefix, `Cannot write template ${templateName}.`);
    log.error(logPrefix, 'Error message: %j', error.message);
  }
};

export const writeFileTemplates = (templates: FileTemplate[]) => {
  return Promise.all(templates.map(writeFileTemplate));
};

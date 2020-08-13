import fs from 'fs';
import log from 'npmlog';
import path from 'path';

const logPrefix = 'writeTemplate';

export type TemplateParams = any;

const getContent = async ({
  templateName,
  templateDir,
  templateParams,
}: {
  templateName: string;
  templateDir: string;
  templateParams: TemplateParams;
}): Promise<string> => {
  const contentGenerator = (
    await import(path.resolve(templateDir, templateName))
  ).default;
  if (typeof contentGenerator === 'function') {
    return contentGenerator(templateParams).trim();
  }
  return contentGenerator.trim();
};

export const writeTemplate = async ({
  templateDir,
  templateName,
  writeDir = '.',
  templateParams,
}: {
  templateName: string;
  templateDir: string;
  writeDir?: string;
  templateParams: TemplateParams;
}) => {
  try {
    const content = await getContent({
      templateDir,
      templateName,
      templateParams,
    });
    const fullWriteDir = path.resolve(
      process.cwd(),
      writeDir,
      templateName.replace('dot-', '.'),
    );
    /**
     * Create if it does not exist.
     */
    if (writeDir) {
      const dirFullPath = path.resolve(process.cwd(), writeDir);
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

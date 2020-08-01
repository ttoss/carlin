import fs from 'fs';
import log from 'npmlog';
import path from 'path';

const logPrefix = 'writeTemplate';

export type TemplateParams = {};

const getContent = async ({
  name,
  templateParams,
}: {
  name: string;
  templateParams: TemplateParams;
}): Promise<string> => {
  const contentGenerator = (await import(path.resolve(__dirname, name)))
    .default;
  if (typeof contentGenerator === 'function') {
    return contentGenerator(templateParams).trim();
  }
  return contentGenerator.trim();
};

export const writeTemplate = async ({
  dir,
  template,
  templateParams,
}: {
  dir?: string;
  template: string;
  templateParams: TemplateParams;
}) => {
  try {
    const content = await getContent({ name: template, templateParams });
    const contentPath = path.resolve(
      process.cwd(),
      dir || '.',
      template.replace('dot-', '.')
    );
    /**
     * Create if it does not exist.
     */
    if (dir) {
      const dirFullPath = path.resolve(process.cwd(), dir);
      if (!fs.existsSync(dirFullPath)) {
        fs.mkdirSync(dirFullPath);
      }
    }
    return await fs.promises.writeFile(contentPath, content);
  } catch (error) {
    log.error(logPrefix, `Cannot write template ${template}.`);
    log.error(logPrefix, 'Error message: %j', error.message);
  }
};

/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { S3 } from 'aws-sdk';
import fs from 'fs';
import glob from 'glob';
import log from 'npmlog';
import path from 'path';

const logPrefix = 's3';

const s3 = new S3({ apiVersion: '2006-03-01' });

type ContentType =
  | 'application/manifest+json'
  | 'text/css'
  | 'text/html'
  | 'text/javascript'
  | 'image/vnd.microsoft.icon'
  | 'image/jpeg'
  | 'image/webp'
  | 'application/javascript'
  | 'application/json'
  | 'binary/octet-stream'
  | 'image/png'
  | 'image/svg+xml'
  | 'text/plain'
  | 'text/yaml'
  | 'text/yaml';

type ContentEncoding = 'utf8' | 'base64' | 'binary';

export const getContentMetadata = (
  file: string,
): { encoding: ContentEncoding; type: ContentType } => {
  const contentMetadata: {
    [key: string]: { encoding: ContentEncoding; type: ContentType };
  } = {
    css: { type: 'text/css', encoding: 'utf8' },
    html: { type: 'text/html', encoding: 'utf8' },
    ico: { type: 'image/vnd.microsoft.icon', encoding: 'binary' },
    jpeg: { type: 'image/jpeg', encoding: 'binary' },
    jpg: { type: 'image/jpeg', encoding: 'binary' },
    js: { type: 'application/javascript', encoding: 'utf8' },
    json: { type: 'application/json', encoding: 'utf8' },
    LICENSE: { type: 'text/plain', encoding: 'utf8' },
    map: { type: 'binary/octet-stream', encoding: 'utf8' },
    mjs: { type: 'text/javascript', encoding: 'utf8' },
    png: { type: 'image/png', encoding: 'binary' },
    svg: { type: 'image/svg+xml', encoding: 'binary' },
    txt: { type: 'text/plain', encoding: 'utf8' },
    webmanifest: { type: 'application/manifest+json', encoding: 'utf8' },
    webp: { type: 'image/webp', encoding: 'binary' },
    yaml: { type: 'text/yaml', encoding: 'utf8' },
    yml: { type: 'text/yaml', encoding: 'utf8' },
  };

  const extension = file.split('.').pop();

  if (!extension || !contentMetadata[extension]) {
    log.warn(logPrefix, `Content metadata for file ${file} does not exist.`);
    return { type: 'text/plain', encoding: 'utf8' };
  }

  return contentMetadata[extension];
};

export const getBucketKeyUrl = ({
  bucket,
  key,
}: {
  bucket: string;
  key: string;
}) => {
  return `https://s3.amazonaws.com/${bucket}/${key}`;
};

export const uploadFileToS3 = async ({
  bucket,
  contentType,
  file,
  filePath,
  key,
}: {
  bucket: string;
  contentType?: ContentType;
  file?: Buffer;
  filePath?: string;
  key: string;
}) => {
  if (!file && !filePath) {
    throw new Error('file or filePath must be defined');
  }

  log.info(logPrefix, `Uploading file to ${bucket}/${key}...`);

  const params: S3.PutObjectRequest = {
    Bucket: bucket,
    Key: key,
  };

  if (file) {
    params.ContentType = contentType;
    params.Body = file;
  } else if (filePath) {
    const readFile = await fs.promises.readFile(filePath || '', 'utf8');
    const { type, encoding } = getContentMetadata(filePath);
    params.ContentType = type;
    params.ContentEncoding = encoding;
    params.Body = Buffer.from(readFile);
  }

  const { Bucket, Key, VersionId } = (await s3.upload(params).promise()) as any;

  return {
    bucket: Bucket as string,
    key: Key as string,
    versionId: VersionId as string,
    url: getBucketKeyUrl({ bucket: Bucket, key: Key }),
  };
};

export const uploadDirectoryToS3 = async ({
  bucket,
  bucketKey = '',
  directory,
}: {
  bucket: string;
  bucketKey?: string;
  directory: string;
}) => {
  log.info(
    logPrefix,
    `Uploading directory ${directory} to ${bucket}/${bucketKey}...`,
  );

  /**
   * Get all files and directories inside ${directory}.
   */
  const allFilesAndDirectories = await new Promise<string[]>(
    (resolve, reject) => {
      glob(`${directory}/**/*`, (err, matches) => {
        return err ? reject(err) : resolve(matches);
      });
    },
  );

  const allFiles = allFilesAndDirectories.filter((item) =>
    fs.lstatSync(item).isFile(),
  );

  for (const [index, file] of allFiles.entries()) {
    log.info(logPrefix, `Upload ${index + 1}/${allFiles.length}`);
    await uploadFileToS3({
      bucket,
      key: path.relative(directory, file),
      filePath: file,
    });
  }
};

export const emptyS3Directory = async ({
  bucket,
  directory = '',
}: {
  bucket: string;
  directory?: string;
}) => {
  log.info(logPrefix, `${bucket}/${directory} will be empty`);
  try {
    const { Contents, IsTruncated } = await s3
      .listObjectsV2({
        Bucket: bucket,
        Prefix: directory,
      })
      .promise();

    if (Contents && Contents.length > 0) {
      /**
       * Get object versions
       */
      const objectsPromises = Contents.filter(({ Key }) => !!Key).map(
        async ({ Key }) => {
          const { Versions = [] } = await s3
            .listObjectVersions({
              Bucket: bucket,
              Prefix: Key,
            })
            .promise();
          return {
            Key: Key as string,
            Versions: Versions.map(({ VersionId }) => VersionId || undefined),
          };
        },
      );

      const objects = await Promise.all(objectsPromises);

      const objectsWithVersionsIds = objects.reduce<
        Array<{
          Key: string;
          VersionId?: string;
        }>
      >((acc, { Key, Versions }) => {
        const objectWithVersionsIds = Versions.map((VersionId) => ({
          Key,
          VersionId,
        }));
        return [...acc, ...objectWithVersionsIds];
      }, []);

      await s3
        .deleteObjects({
          Bucket: bucket,
          Delete: { Objects: objectsWithVersionsIds },
        })
        .promise();
    }

    /**
     * Truncated is files that exists but weren't listed from S3 API.
     */
    if (IsTruncated) {
      await emptyS3Directory({ bucket, directory });
    }

    log.info(logPrefix, `${bucket}/${directory} is empty`);
  } catch (err) {
    log.error(logPrefix, `Cannot empty ${bucket}/${directory}`);
    throw err;
  }
};

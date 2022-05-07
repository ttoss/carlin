import {
  defaultBuildFolders,
  findDefaultBuildFolder,
} from './findDefaultBuildFolder';
import {
  emptyS3Directory,
  getAllFilesInsideADirectory,
  uploadDirectoryToS3,
} from '../s3';
import { getPackageVersion } from '../../utils';

export const uploadBuiltAppToS3 = async ({
  buildFolder: directory,
  bucket,
  cloudfront,
}: {
  buildFolder?: string;
  bucket: string;
  cloudfront?: boolean;
}) => {
  const version = cloudfront ? getPackageVersion() : undefined;

  /**
   * Only empty directory if the number of the files inside $directory.
   * If the number of files is zero, uploadDirectoryToS3 will thrown.
   */
  if (directory) {
    const files = await getAllFilesInsideADirectory({ directory });
    if (files.length > 0) {
      await emptyS3Directory({ bucket, directory: version });
    }
    await uploadDirectoryToS3({ bucket, bucketKey: version, directory });
    return;
  }

  const defaultDirectory = await findDefaultBuildFolder();

  if (defaultDirectory) {
    await emptyS3Directory({ bucket, directory: version });
    await uploadDirectoryToS3({
      bucket,
      bucketKey: version,
      directory: defaultDirectory,
    });
    return;
  }

  throw new Error(
    `build-folder option wasn't provided and files weren't found in ${defaultBuildFolders.join(
      ', '
    )} directories.`
  );
};

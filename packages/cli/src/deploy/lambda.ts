import AdmZip from 'adm-zip';
import builtins from 'builtin-modules';
import fs from 'fs';
import log from 'npmlog';
import * as rollup from 'rollup';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

import { uploadFileToS3 } from './s3';

import { getBaseStackBucketName } from './baseStack/getBaseStackBucketName';

const logPrefix = 'lambda';

export const buildLambdaSingleFile = async ({
  lambdaExternals,
  lambdaInput,
}: {
  lambdaExternals: string[];
  lambdaInput: string;
}) => {
  log.info(logPrefix, 'Building Lambda single file...');

  const bundle = await (async () => {
    try {
      return await rollup.rollup({
        external: ['aws-sdk', ...builtins, ...lambdaExternals],
        input: lambdaInput,
        plugins: [
          resolve({
            preferBuiltins: true,
          }),
          json(),
          typescript({
            declaration: false,
            target: 'es2017',
          }),
          commonjs({
            include: /\**node_modules\**/,
          }),
        ],
      });
    } catch (err) {
      log.error(
        logPrefix,
        'Rollup cannot build. Maybe this issue may help: https://github.com/rollup/plugins/issues/287#issuecomment-611368317',
      );
      throw err;
    }
  })();
  const { output } = await bundle.generate({
    banner:
      '/* Bundled by Carlin using Rollup.js. \n Check out https://carlin.ttoss.dev for more information. */',
    exports: 'named',
    format: 'cjs',
  });
  return output[0].code;
};

const updateCodeToS3 = async ({
  code,
  stackName,
}: {
  code: string;
  stackName: string;
}) => {
  const zip = new AdmZip();
  zip.addFile('index.js', Buffer.from(code));
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
  }
  zip.writeZip('dist/lambda.zip');
  const bucketName = await getBaseStackBucketName();
  return uploadFileToS3({
    bucket: bucketName,
    contentType: 'application/zip' as any,
    key: `lambdas/${stackName}/lambda.zip`,
    file: zip.toBuffer(),
  });
};

export const deployLambdaCode = async ({
  lambdaExternals,
  lambdaInput,
  stackName,
}: {
  lambdaExternals: string[];
  lambdaInput: string;
  stackName: string;
}) => {
  if (!fs.existsSync(lambdaInput)) {
    return undefined;
  }
  log.info(logPrefix, 'Deploy Lambda code.');
  const code = await buildLambdaSingleFile({ lambdaExternals, lambdaInput });
  const { bucket, key, versionId } = await updateCodeToS3({ code, stackName });
  return { bucket, key, versionId };
};

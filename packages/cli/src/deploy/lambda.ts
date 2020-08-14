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

import { getPepeBucketName } from './pepeBase/getPepeBucketName';

const logPrefix = 'lambda';

export const buildLambdaSingleFile = async ({
  lambdaExternals,
  lambdaInput,
}: {
  lambdaExternals: string[];
  lambdaInput: string;
}) => {
  log.info(logPrefix, 'Building Lambda single file...');
  const bundle = await rollup.rollup({
    external: ['aws-sdk', ...builtins, ...lambdaExternals],
    input: lambdaInput,
    plugins: [
      resolve({
        preferBuiltins: true,
      }),
      json(),
      typescript({
        target: 'es2017',
      }),
      commonjs({
        include: /\**node_modules\**/,
      }),
    ],
  });
  const { output } = await bundle.generate({
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
  zip.writeZip('dist/lambda.zip');
  const pepeBucketName = await getPepeBucketName();
  return uploadFileToS3({
    bucket: pepeBucketName,
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

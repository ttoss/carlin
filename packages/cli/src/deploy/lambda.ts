import AdmZip from 'adm-zip';
import builtins from 'builtin-modules';
import fs from 'fs';
import log from 'npmlog';
import path from 'path';
import webpack from 'webpack';

import { uploadFileToS3 } from './s3';

import { getBaseStackBucketName } from './baseStack/getBaseStackBucketName';

const logPrefix = 'lambda';

const outFolder = 'dist';

const webpackOutputFilename = 'index.js';

/**
 * Using Webpack because of issue #8.
 * {@link https://github.com/ttoss/carlin/issues/8}
 */
export const buildLambdaSingleFile = async ({
  lambdaExternals,
  lambdaInput,
}: {
  lambdaExternals: string[];
  lambdaInput: string;
}) => {
  log.info(logPrefix, 'Building Lambda single file...');

  const webpackConfig: webpack.Configuration = {
    entry: path.join(process.cwd(), lambdaInput),
    mode: 'none',
    externals: ['aws-sdk', ...builtins, ...lambdaExternals],
    module: {
      rules: [
        {
          exclude: /node_modules/,
          test: /\.tsx?$/,
          loader: require.resolve('ts-loader'),
          options: {
            compilerOptions: {
              /**
               * Packages like 'serverless-http' cannot be used without this
               * property.
               */
              allowSyntheticDefaultImports: true,
              esModuleInterop: true,
              declaration: false,
              target: 'es2017',
              /**
               * Fix https://stackoverflow.com/questions/65202242/how-to-use-rollup-js-to-create-a-common-js-and-named-export-bundle/65202822#65202822
               */
              module: 'esnext',
              noEmit: false,
            },
          },
        },
      ],
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.json'],
    },
    target: 'node',
    output: {
      filename: webpackOutputFilename,
      libraryTarget: 'commonjs',
      path: path.join(process.cwd(), outFolder),
    },
  };

  const compiler = webpack(webpackConfig);

  return new Promise<void>((resolve, reject) => {
    compiler.run((err) => {
      if (err) {
        return reject(err);
      }

      return resolve();
    });
  });
};

const uploadCodeToS3 = async ({ stackName }: { stackName: string }) => {
  const zip = new AdmZip();
  const code = fs.readFileSync(
    path.join(process.cwd(), outFolder, webpackOutputFilename),
  );
  zip.addFile('index.js', code);
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

/**
 * 1. Build Lambda code using Webpack. The build process create a single file.
 *  1. If packages is passed to `lambda-externals` option, Webpack will ignore
 *  them.
 * 1. Zip the output file.
 * 1. Upload the zipped code to base stack bucket.
 */
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
  await buildLambdaSingleFile({ lambdaExternals, lambdaInput });
  const { bucket, key, versionId } = await uploadCodeToS3({ stackName });
  return { bucket, key, versionId };
};

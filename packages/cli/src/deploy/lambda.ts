import AdmZip from 'adm-zip';
import builtins from 'builtin-modules';
import fs from 'fs';
import log from 'npmlog';
import path from 'path';
import webpack from 'webpack';

import { getBaseStackBucketName } from './baseStack/getBaseStackBucketName';
import { deployLambdaLayer } from './lambdaLayer/deployLambdaLayer';
import { uploadFileToS3 } from './s3';

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

const deployLambdaLayers = async ({
  lambdaExternals = [],
}: {
  lambdaExternals: string[];
}) => {
  if (lambdaExternals.length === 0) {
    return;
  }

  log.info(
    logPrefix,
    `--lambda-externals (${lambdaExternals.join(
      ', ',
    )}) was found. Creating Lambda Layers...`,
  );

  const { dependencies } = (() => {
    try {
      // eslint-disable-next-line global-require, import/no-dynamic-require
      return require(path.resolve(process.cwd(), 'package.json')) || {};
    } catch (err) {
      log.error(
        logPrefix,
        'Cannot read package.json. Error message: %j',
        err.message,
      );
      return {};
    }
  })();

  const packages = lambdaExternals.map((le) => {
    const semver = dependencies[le].replace(/(~|\^)/g, '');
    return `${le}@${semver}`;
  });

  await deployLambdaLayer({ packages, deployIfExists: false });
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
  log.info(logPrefix, 'Deploying Lambda code...');
  await deployLambdaLayers({ lambdaExternals });
  await buildLambdaSingleFile({ lambdaExternals, lambdaInput });
  const { bucket, key, versionId } = await uploadCodeToS3({ stackName });
  return { bucket, key, versionId };
};

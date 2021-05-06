import AdmZip from 'adm-zip';
import { CodeBuild } from 'aws-sdk';
import builtins from 'builtin-modules';
import fs from 'fs';
import log from 'npmlog';
import path from 'path';
import webpack from 'webpack';

import { AWS_DEFAULT_REGION } from '../config';
import { waitCodeBuildFinish, getPackageVersion } from '../utils';

import { getBaseStackResource } from './baseStack/getBaseStackResource';
import { deployLambdaLayer } from './lambdaLayer/deployLambdaLayer';
import { uploadFileToS3 } from './s3';

const codeBuild = new CodeBuild({ region: AWS_DEFAULT_REGION });

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
    entry: path.resolve(process.cwd(), lambdaInput),
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

export const uploadCodeToS3 = async ({ stackName }: { stackName: string }) => {
  log.info(logPrefix, `Uploading code to S3...`);

  const zip = new AdmZip();

  const code = fs.readFileSync(
    path.join(process.cwd(), outFolder, webpackOutputFilename),
  );

  zip.addFile('index.js', code);

  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
  }

  zip.writeZip('dist/lambda.zip');

  const bucketName = await getBaseStackResource(
    'BASE_STACK_BUCKET_LOGICAL_NAME',
  );

  return uploadFileToS3({
    bucket: bucketName,
    contentType: 'application/zip' as any,
    key: `lambdas/${stackName}/lambda.zip`,
    file: zip.toBuffer(),
  });
};

export const deployLambdaLayers = async ({
  lambdaExternals = [],
}: {
  lambdaExternals: string[];
}) => {
  if (lambdaExternals.length === 0) {
    return;
  }

  log.info(
    logPrefix,
    `--lambda-externals [${lambdaExternals.join(
      ', ',
    )}] was found. Creating other layers...`,
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

  const packages = lambdaExternals.map((lambdaExternal) => {
    const semver = dependencies[lambdaExternal].replace(/(~|\^)/g, '');
    return `${lambdaExternal}@${semver}`;
  });

  await deployLambdaLayer({ packages, deployIfExists: false });
};

export const uploadCodeToECR = async ({
  bucket,
  key,
  lambdaExternals,
  lambdaDockerfile,
}: {
  bucket: string;
  key: string;
  versionId: string;
  lambdaDockerfile?: string;
  lambdaExternals: string[];
}) => {
  const TEMP = 1;

  if (TEMP) {
    throw new Error('uploadCodeToECR not finished yet.');
  }

  const lambdaBuilder = await getBaseStackResource(
    'BASE_STACK_LAMBDA_IMAGE_BUILDER_LOGICAL_NAME',
  );

  const defaultDockerfile = [
    'FROM public.ecr.aws/lambda/nodejs:14',
    // eslint-disable-next-line no-template-curly-in-string
    'COPY . ${LAMBDA_TASK_ROOT}',
    'RUN npm install',
  ].join('\n');

  const { build } = await codeBuild
    .startBuild({
      environmentVariablesOverride: [
        {
          name: 'DOCKERFILE',
          value: lambdaDockerfile || defaultDockerfile,
        },
        {
          name: 'LAMBDA_EXTERNALS',
          value: lambdaExternals.join(' '),
        },
        {
          name: 'IMAGE_TAG',
          value: getPackageVersion(),
        },
        {
          name: 'REPOSITORY_ECR_REPOSITORY',
          value: 'testtesteste',
        },
      ],
      projectName: lambdaBuilder,
      sourceLocationOverride: `${bucket}/${key}`,
      sourceTypeOverride: 'S3',
    })
    .promise();

  if (!build?.id) {
    throw new Error('Cannot start build.');
  }

  await waitCodeBuildFinish({ buildId: build.id, name: 'lambda-builder' });

  const imageUri =
    '178804353523.dkr.ecr.us-east-1.amazonaws.com/testtesteste:0.0.1';

  return { imageUri };
};

/**
 * 1. Build Lambda code using Webpack. The build process create a single file.
 *  1. If packages is passed to `lambda-externals` option, Webpack will ignore
 *  them.
 * 1. Zip the output file.
 * 1. Upload the zipped code to base stack bucket.
 */
export const deployLambdaCode = async ({
  lambdaDockerfile,
  lambdaExternals,
  lambdaImage,
  lambdaInput,
  stackName,
}: {
  lambdaDockerfile?: string;
  lambdaExternals: string[];
  lambdaImage?: boolean;
  lambdaInput: string;
  stackName: string;
}) => {
  if (!fs.existsSync(lambdaInput)) {
    return undefined;
  }

  log.info(logPrefix, 'Deploying Lambda code...');

  await buildLambdaSingleFile({ lambdaExternals, lambdaInput });

  const { bucket, key, versionId } = await uploadCodeToS3({ stackName });

  if (!lambdaImage) {
    await deployLambdaLayers({ lambdaExternals });
    return { bucket, key, versionId };
  }

  const { imageUri } = await uploadCodeToECR({
    bucket,
    key,
    versionId,
    lambdaDockerfile,
    lambdaExternals,
  });

  return { imageUri };
};

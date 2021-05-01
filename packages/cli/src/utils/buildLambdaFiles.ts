import builtins from 'builtin-modules';
import * as fs from 'fs';
import * as path from 'path';
import webpack from 'webpack';

/**
 * Using Webpack because of issue #8.
 * {@link https://github.com/ttoss/carlin/issues/8}
 */
export const buildLambdaSingleFile = async ({
  lambdaExternals,
  lambdaInput,
  output,
}: {
  lambdaExternals: string[];
  lambdaInput: string;
  output?: webpack.Configuration['output'];
}) => {
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
    output,
  };

  const compiler = webpack(webpackConfig);

  return new Promise<webpack.Stats | undefined>((resolve, reject) => {
    compiler.run((err, result) => {
      if (err) {
        return reject(err);
      }

      return resolve(result);
    });
  });
};

export const getBuiltLambdaFile = async ({
  dirname,
  relativePath,
  lambdaExternals = [],
}: {
  dirname: string;
  relativePath: string;
  lambdaExternals?: string[];
}) => {
  const getPath = (extension: 'js' | 'ts') =>
    path.resolve(dirname, `${relativePath}.${extension}`);

  const lambdaInput = await (async () => {
    if (fs.existsSync(getPath('js'))) {
      return fs.promises.readFile(getPath('js'), 'utf-8');
    }

    if (fs.existsSync(getPath('ts'))) {
      return fs.promises.readFile(getPath('ts'), 'utf-8');
    }

    throw new Error(`File ${relativePath} doesn't exist.`);
  })();

  const stats = await buildLambdaSingleFile({ lambdaExternals, lambdaInput });

  if (!stats) {
    throw new Error(`getBuiltFile cannot build ${relativePath}`);
  }

  return stats.toJson();
};

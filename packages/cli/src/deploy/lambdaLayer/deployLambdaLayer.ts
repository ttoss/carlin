import log from 'npmlog';

import { CodeBuild } from 'aws-sdk';
import { pascalCase } from 'change-case';

import { NAME, AWS_DEFAULT_REGION } from '../../config';

import { getBaseStackBucketName } from '../baseStack/getBaseStackBucketName';
import { deploy, doesStackExist } from '../cloudFormation.core';
import {
  deployErrorLogs,
  handleDeployError,
  handleDeployInitialization,
} from '../utils';

import {
  getBuildSpec,
  getCodeBuildTemplate,
  PROJECT_NAME_OUTPUT_KEY,
} from './codebuild.template';
import { CloudFormationTemplate } from '../../utils';

const codeBuild = new CodeBuild({ region: AWS_DEFAULT_REGION });

const logPrefix = 'lambda-layer';

const LAMBDA_LAYER_CODE_BUILD_STACK_NAME = pascalCase(
  `${NAME}LambdaLayerCodeBuildProject`,
);

const deployCodeBuildProject = async () => {
  const { stackName } = await handleDeployInitialization({
    logPrefix,
    stackName: LAMBDA_LAYER_CODE_BUILD_STACK_NAME,
  });

  const template = getCodeBuildTemplate({
    baseBucketName: await getBaseStackBucketName(),
  });

  const params = { StackName: stackName };

  const { Outputs } = await deploy({ params, template });

  return Outputs?.find(({ OutputKey }) => OutputKey === PROJECT_NAME_OUTPUT_KEY)
    ?.OutputValue;
};

const createLambdaLayerZipFile = async ({
  codeBuildProjectName,
  packageName,
}: {
  codeBuildProjectName: string;
  packageName: string;
}) => {
  log.info(logPrefix, `Creating zip file for package ${packageName}...`);

  const { build } = await codeBuild
    .startBuild({
      buildspecOverride: getBuildSpec({ packageName }),
      projectName: codeBuildProjectName,
    })
    .promise();

  if (!build?.id) {
    throw new Error('Cannot start build.');
  }

  let artifactBucket;

  const checkIfBuildIsFinished = async (buildId: string) => {
    const { builds } = await codeBuild
      .batchGetBuilds({ ids: [buildId] })
      .promise();

    return new Promise<CodeBuild.Build | undefined>((resolve, reject) => {
      setTimeout(() => {
        const executedBuild = builds?.find(({ id }) => id === buildId);

        log.info(
          logPrefix,
          `Build status for package ${packageName}: ${executedBuild?.buildStatus}`,
        );

        if (executedBuild && executedBuild.currentPhase === 'COMPLETED') {
          if (executedBuild.buildStatus === 'SUCCEEDED') {
            resolve(executedBuild);
          } else if (executedBuild.buildStatus === 'FAILURE') {
            reject(
              new Error(`Cannot execute build for package ${packageName}.`),
            );
          }
        }

        resolve(undefined);
      }, 5000);
    });
  };

  while (!artifactBucket) {
    // eslint-disable-next-line no-await-in-loop
    const result = await checkIfBuildIsFinished(build.id);

    if (result) {
      if (result.artifacts?.location) {
        const location = result.artifacts.location.split('/');

        const bucket = location.shift()?.replace('arn:aws:s3:::', '');

        if (!bucket) {
          throw new Error('Cannot retrieve bucket name.');
        }

        const key = location.join('/');
        artifactBucket = { bucket, key };
      } else {
        throw new Error(
          `Cannot get artifact location for package ${packageName}`,
        );
      }
    }
  }

  return artifactBucket;
};

/**
 * The CloudFormation template created to deploy a Lambda Layer.
 *
 * - The Layer name is the same as the Stack name.
 */
export const getLambdaLayerTemplate = ({
  bucket,
  key,
  packageName,
}: {
  bucket: string;
  key: string;
  packageName: string;
}): CloudFormationTemplate => {
  const description = packageName
    /**
     * Description has limit of 256.
     * https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-layerversion.html#cfn-lambda-layerversion-description
     */
    .substring(0, 256);

  return {
    AWSTemplateFormatVersion: '2010-09-09',
    Resources: {
      LambdaLayer: {
        Type: 'AWS::Lambda::LayerVersion',
        Properties: {
          CompatibleRuntimes: ['nodejs12.x', 'nodejs14.x'],
          Content: {
            S3Bucket: bucket,
            S3Key: key,
          },
          Description: description,
          LayerName: { Ref: 'AWS::StackName' },
        },
      },
    },
    Outputs: {
      LambdaLayerVersion: {
        Description: description,
        Value: { Ref: 'LambdaLayer' },
        Export: {
          Name: { Ref: 'AWS::StackName' },
        },
      },
    },
  };
};

/**
 * The stack name is given by `CarlinLambdaLayer` prefix and the package name with
 * `@` and `/` removed and `.` replace by the word `dot`.
 */
export const getPackageLambdaLayerStackName = (packageName: string) => {
  return pascalCase(
    `${NAME} LambdaLayer ${packageName.replace(/\./g, 'dot')}`,
  ).replace(/_/g, '');
};

const getPackagesThatAreNotDeployed = async ({
  packages,
}: {
  packages: string[];
}) => {
  return (
    await Promise.all(
      packages.map(async (packageName) => {
        const stackName = getPackageLambdaLayerStackName(packageName);
        return (await doesStackExist({ stackName })) ? '' : packageName;
      }),
    )
  ).filter((packageName) => !!packageName);
};

export const deployLambdaLayer = async ({
  packages,
  createIfExists = true,
}: {
  createIfExists: boolean;
  packages: string[];
}) => {
  try {
    const packagesToBeDeployed = createIfExists
      ? packages
      : await getPackagesThatAreNotDeployed({ packages });

    if (packagesToBeDeployed.length === 0) {
      return;
    }

    const codeBuildProjectName = await deployCodeBuildProject();

    if (!codeBuildProjectName) {
      throw new Error(
        "Cannot deploy lambda-layer because AWS CodeBuild project doesn't exist.",
      );
    }

    const deployLambdaLayerSinglePackage = async (packageName: string) => {
      try {
        const { bucket, key } = await createLambdaLayerZipFile({
          codeBuildProjectName,
          packageName,
        });

        const lambdaLayerTemplate = getLambdaLayerTemplate({
          packageName,
          bucket,
          key,
        });

        await deploy({
          template: lambdaLayerTemplate,
          terminationProtection: true,
          params: { StackName: getPackageLambdaLayerStackName(packageName) },
        });
      } catch (error) {
        deployErrorLogs({ error, logPrefix });
      }
    };

    await Promise.all(
      packagesToBeDeployed.map((packageName) =>
        deployLambdaLayerSinglePackage(packageName),
      ),
    );
  } catch (error) {
    handleDeployError({ error, logPrefix });
  }
};

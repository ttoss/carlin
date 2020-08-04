import log from 'npmlog';
import yargs from 'yargs';

import { getAwsAccountId, getEnvironment } from '../utils';

import { deployCloudFormation, destroyCloudFormation } from './cloudFormation';
// import { runE2E } from '../runE2E';
// import { deployLambda } from './lambda';
// import { deployLambdaLayer } from './lambdaLayer';
import { deployStaticApp } from './staticApp/staticApp';

// import { getAwsAccountId } from '../getAwsAccountId';
// import { getEnvironment } from '../getEnvironment';

// import {
//   Environment,
//   SANDBOX_AWS_ACCOUNT_ID,
//   ENVIRONMENTS,
// } from '../../config';

const checkAwsAccountId = async ({
  sandboxAwsAccountId,
}: {
  sandboxAwsAccountId?: string;
}) => {
  const [awsAccountId, environment] = await Promise.all([
    getAwsAccountId(),
    getEnvironment(),
  ]);

  if (true) {
    console.log(yargs().argv);
    console.log(process.env);
    process.exit();
  }

  /**
   * Cancel deployment if target AWS account is sandbox and environment
   * is Production.
   */
  if (environment === 'Production') {
    if (!sandboxAwsAccountId) {
      throw new Error(
        `Cannot deploy Production environment without define 'sandboxAwsAccountId' parameter.`
      );
    }

    if (awsAccountId === sandboxAwsAccountId) {
      throw new Error(
        `Cannot deploy Production environment to Sandbox AWS Account (${sandboxAwsAccountId}).`
      );
    }
  }
};

export const deploy = async (args: {
  sandboxAwsAccountId?: string;
  destroy: boolean;
  // e2e: boolean;
  // lambda: boolean;
  // lambdaExternals: string[];
  // lambdaInput: string;
  // lambdaSingleFile: boolean;
  // lambdaLayer: boolean;
  // parameters: Array<{ key: string; value: string }>;
  // skipEnvironments: ;
  skipAssets: boolean;
  stackName?: string;
  staticApp: boolean;
  staticAppBuildFolder: string;
  // staticAppAliases?: string[];
  // acmArnExportedName?: string;
  staticAppEdge: boolean;
  templatePath: string;
}) => {
  try {
    const environment = getEnvironment();

    console.log({ environment });

    process.exit();

    // const {
    //   sandboxAwsAccountId,
    //   destroy,
    //   // e2e,
    //   // skipEnvironments,
    //   // skipAssets,
    //   // lambda,
    //   // lambdaLayer,
    //   staticApp,
    // } = args;

    // // if (skipEnvironments.includes(environment)) {
    // //   log.info('deploy', `Environment ${environment} should be skipped.`);
    // //   return;
    // // }

    // await checkAwsAccountId({ sandboxAwsAccountId });

    // if (destroy) {
    //   await destroyCloudFormation(args);
    //   return;
    // }

    // const whichDeploy = (() => {
    //   if (staticApp) {
    //     return deployStaticApp;
    //   }

    //   // /**
    //   //  * If skipAssets, then deployCloudFormation is called instead methods
    //   //  * which deploy assets.
    //   //  */
    //   // if (lambdaLayer && !skipAssets) {
    //   //   return deployLambdaLayer;
    //   // }

    //   // if (lambda) {
    //   //   return deployLambda;
    //   // }

    //   return deployCloudFormation;
    // })();

    // // await whichDeploy(args);

    // // if (e2e) {
    // //   await runE2E();
    // // }
  } catch (error) {
    log.error('deploy', `Cannot deploy: ${error.message}`);
  }
};

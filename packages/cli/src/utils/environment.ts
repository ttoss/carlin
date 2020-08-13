let environment: string | undefined;

export const setEnvironment = (e: string) => {
  environment = e;
};

export const getEnvironment = () => environment;

// import { getCurrentBranch } from './getCurrentBranch';

// export const ENVIRONMENTS = [
//   /**
//    * https://en.wikipedia.org/wiki/Deployment_environment#Testing
//    * The purpose of the test environment is to allow human testers to exercise
//    * new and changed code via either automated checks or non-automated
//    * techniques.
//    */
//   'Testing',
//   'Development',
//   'Staging',
//   'Production',
//   'NoEnv',
// ] as const;

// export type Environment = typeof ENVIRONMENTS[number];

// export const getEnvironment = async (): Promise<Environment> => {
//   if (process.env.ENVIRONMENT) {
//     /**
//      * We check this on CLI to guarantee that process.env.ENVIRONMENT is
//      * a valid environment.
//      */
//     const environment = process.env.ENVIRONMENT as Environment;
//     return environment;
//   }

//   const branchName = await getCurrentBranch();

//   if (branchName === 'master') {
//     return 'Development';
//   }

//   return 'Testing';
// };

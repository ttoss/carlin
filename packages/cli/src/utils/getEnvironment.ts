import { getEnvVar } from './environmentVariables';

export const getEnvironment = () => getEnvVar('ENVIRONMENT');

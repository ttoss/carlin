const cache = new Map();

export { cache };

export type EnvironmentVariables = 'BRANCH' | 'ENVIRONMENT' | 'PROJECT';

export const hasEnvVar = (key: EnvironmentVariables) => cache.has(key);

export const getEnvVar = (key: EnvironmentVariables) => {
  return hasEnvVar(key) ? cache.get(key) : undefined;
};

export const setEnvVar = (key: EnvironmentVariables, value: any) =>
  cache.set(key, value);

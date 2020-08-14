let environment: string | undefined;

export const setEnvironment = (e: string) => {
  environment = e;
};

export const getEnvironment = () => environment;

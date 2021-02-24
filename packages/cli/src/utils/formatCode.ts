import prettier from 'prettier';

export const formatCode = (code: string) => {
  return prettier.format(code, { parser: 'babel' });
};

import jsdoc from 'jsdoc-api';
import path from 'path';

export const getMethodComment = ({
  pathFromDist,
  method,
}: {
  pathFromDist: string;
  method: string;
}): string => {
  const res = jsdoc.explainSync({
    files: path.resolve(process.cwd(), '../cli/dist', pathFromDist),
  });
  const { description } =
    res.find(({ name, kind }) => name === method && kind === 'function') || {};
  return description;
};

import jsdoc from 'jsdoc-api';
import path from 'path';

export const getComment = ({
  pathFromDist,
  longname,
}: {
  pathFromDist: string;
  longname: string;
}): string => {
  const res = jsdoc.explainSync({
    files: path.resolve(process.cwd(), '../cli/dist', pathFromDist),
  });
  const { description } = res.find(
    (p) => p.longname === longname && p.undocumented !== true,
  ) || { description: '***DESCRIPTION NOT FOUND***' };
  return description;
};

export const getComments = <O extends Record<string, string>>(
  commentsDir: O,
) => {
  return Object.entries(commentsDir).reduce<
    { [key in keyof typeof commentsDir]: string }
  >((acc, [longname, value]) => {
    return {
      ...acc,
      [longname]: getComment({ longname, pathFromDist: value }),
    };
  }, {} as any);
};

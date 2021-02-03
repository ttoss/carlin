const jsdoc = require('jsdoc-api');
const { compiler } = require('markdown-to-jsx');
const path = require('path');
const { renderToString } = require('react-dom/server');

const getComment = ([pathFromDist, longname]) => {
  const res = jsdoc.explainSync({
    files: path.resolve(process.cwd(), '../cli/dist', pathFromDist),
  });
  const { description } = res.find(
    (p) => p.longname === longname && p.undocumented !== true,
  ) || { description: '***DESCRIPTION NOT FOUND***' };
  return description;
};

const toHtml = (comment) => renderToString(compiler(comment));

const getComments = (commentsDir, { html } = { html: true }) =>
  Object.entries(commentsDir).reduce((acc, [key, value]) => {
    const comment = getComment(value);
    return {
      ...acc,
      [key]: html ? toHtml(comment) : comment,
    };
  }, {});

module.exports = { getComment, getComments, toHtml };

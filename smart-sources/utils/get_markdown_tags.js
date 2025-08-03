/**
 * @file get_markdown_tags.js
 * @description Extracts unique Obsidian-style tags from markdown content.
 */

/**
 * Extract unique tags from markdown content.
 * @param {string} content - markdown text
 * @returns {string[]} array of unique tags (with leading #)
 */
export const get_markdown_tags = (content='') => {
  const tag_re = /(?<!\w)#([\w/-]+)/g;
  const tags = new Set();
  let match;
  while((match = tag_re.exec(content)) !== null){
    tags.add(`#${match[1]}`);
  }
  return [...tags];
};

export default get_markdown_tags;

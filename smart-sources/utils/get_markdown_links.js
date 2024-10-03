/**
 * Extracts links from markdown content.
 * @param {string} content
 * @returns {Array<{title: string, target: string, line: number}>}
 */
export function get_markdown_links(content) {
  const markdown_link_pattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  const wikilink_pattern = /\[\[([^\|\]]+)(?:\|([^\]]+))?\]\]/g;
  const result = [];

  const extract_links_from_pattern = (pattern, type) => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const title = type === 'markdown' ? match[1] : (match[2] || match[1]);
      const target = type === 'markdown' ? match[2] : match[1];
      const line = content.substring(0, match.index).split('\n').length;
      result.push({ title, target, line });
    }
  };

  extract_links_from_pattern(markdown_link_pattern, 'markdown');
  extract_links_from_pattern(wikilink_pattern, 'wikilink');

  result.sort((a, b) => a.line - b.line || a.target.localeCompare(b.target));

  return result;
}

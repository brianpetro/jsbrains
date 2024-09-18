

export function increase_heading_depth(content, depth) {
  return content.replace(/^(#+)/gm, match => '#'.repeat(match.length + depth));
}

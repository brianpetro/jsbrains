/**
 * @file parse_frontmatter.js
 * @description Parses a string for Obsidian-style YAML frontmatter (triple-dashed at top).
 */

/**
 * Parses numeric/boolean/quoted strings from a YAML snippet.
 * @param {string} raw_value - a single-line or aggregated multiline string
 * @returns {string|number|boolean}
 */
function parse_value(raw_value) {
  const trimmed = raw_value.trim();
  // Handle quoted strings
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  // Handle booleans
  const lower = trimmed.toLowerCase();
  if (lower === 'true') return true;
  if (lower === 'false') return false;
  // Handle numbers
  if (!isNaN(trimmed) && trimmed !== '') {
    return Number(trimmed);
  }
  // Default
  return trimmed;
}

/**
 * Naive YAML block parser for Obsidian-like frontmatter:
 * - top-level "key: value"
 * - "key: >" or "key: |" for multiline
 * - "key:\n  - item1\n  - item2" for arrays
 * @param {string} yaml_block - raw lines inside the triple-dashed block
 * @returns {Object}
 */
function parse_yaml_block(yaml_block) {
  const lines = yaml_block.split(/\r?\n/);
  const data = {};
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    i++;

    // Skip empty or purely comment lines
    if (!line.trim() || line.trim().startsWith('#')) {
      continue;
    }

    const match = line.match(/^([^:]+)\s*:\s*(.*)$/);
    if (!match) {
      // Not a well-formed "key: value" line at top level, ignore
      continue;
    }

    const key = match[1].trim();
    let value = match[2].trim();

    // Detect multiline keys: "key: >" or "key: |"
    if (value === '>' || value === '|') {
      const multiline_lines = [];
      while (i < lines.length) {
        const next_line = lines[i];
        // If next line is not indented, or is a comment, it ends the multiline block
        if (!/^\s+/.test(next_line) || next_line.trim().startsWith('#')) {
          break;
        }
        multiline_lines.push(next_line.replace(/^\s+/, ''));
        i++;
      }
      const joined = multiline_lines.join('\n');
      data[key] = parse_value(joined);
    }
    else if (value === '') {
      // Possibly an array block, e.g.:
      // tags:
      //   - a
      //   - b
      const arr = [];
      let array_consumed = false;

      while (i < lines.length) {
        const next_line = lines[i];
        // If next line doesn't start with '- ', break array read
        if (!next_line.trim().startsWith('- ')) {
          break;
        }
        // For array items, strip out "- "
        const item_value = next_line.trim().slice(2);
        arr.push(parse_value(item_value));
        i++;
        array_consumed = true;
      }

      if (array_consumed) {
        data[key] = arr;
      } else {
        // empty or not an array
        data[key] = '';
      }
    }
    else {
      // Single-line 'key: value'
      data[key] = parse_value(value);
    }
  }

  return data;
}

/**
 * Extracts frontmatter if it's at the very top. If valid frontmatter is found,
 * parses it and returns the remainder as body. Otherwise returns an empty object for frontmatter.
 * @param {string} content - text with or without top-level triple-dashed block
 * @returns {{frontmatter: Object, body: string}}
 */
export function parse_frontmatter(content) {
  // If not starting with triple dash, no frontmatter
  if (!content.startsWith('---')) {
    return { frontmatter: {}, body: content };
  }

  // Split into lines
  const lines = content.split(/\r?\n/);
  // First line is triple-dashes. Find the next line that is also triple-dashes.
  let end_index = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      end_index = i;
      break;
    }
  }

  // If no closing triple-dash found, treat as malformed => ignore frontmatter
  if (end_index === -1) {
    return { frontmatter: {}, body: content };
  }

  // Frontmatter is everything between the first and second triple-dash lines
  const frontmatter_lines = lines.slice(1, end_index);
  const frontmatter_block = frontmatter_lines.join('\n');
  const frontmatter = parse_yaml_block(frontmatter_block);

  // Body is everything after the second triple-dash line
  const body_lines = lines.slice(end_index + 1);
  const body = body_lines.join('\n');

  return { frontmatter, body };
}

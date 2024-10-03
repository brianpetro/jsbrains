export function markdown_to_blocks(markdown) {
  const lines = markdown.split('\n');
  const result = {};
  const heading_stack = [];
  const heading_lines = {};
  const heading_counts = {}; // For tracking multiple occurrences of top-level headings
  const list_item_counts = {}; // Map from parent heading key to list item counts
  let current_list_item = null;
  let in_list_item = false;
  let just_closed_list_item = false;
  let in_frontmatter = false;
  let frontmatter_started = false;
  let root_heading_open = false;
  let root_heading_key = '#';
  let in_code_block = false;

  for (let i = 0; i < lines.length; i++) {
    const line_number = i + 1;
    const line = lines[i];
    const trimmed_line = line.trim();

    // Handle frontmatter
    if (trimmed_line === '---') {
      if (!frontmatter_started) {
        // Start of frontmatter
        frontmatter_started = true;
        in_frontmatter = true;
        heading_lines['#---frontmatter---'] = [line_number, null];
        continue;
      } else if (in_frontmatter) {
        // End of frontmatter
        in_frontmatter = false;
        heading_lines['#---frontmatter---'][1] = line_number;
        continue;
      }
    }

    if (in_frontmatter) {
      // Do nothing else while in frontmatter
      continue;
    }

    // Check for code block start/end
    if (trimmed_line.startsWith('```')) {
      in_code_block = !in_code_block;
      // Proceed to process line (include it in line ranges)
      // Do not process headings or list items when in_code_block is true
    }

    if (!in_code_block) {
      // Check for headings
      const heading_match = trimmed_line.match(/^(#{1,6})\s*(.+)$/);
      if (heading_match) {
        const level = heading_match[1].length;
        let title = heading_match[2].trim();

        // Handle multiple occurrences of top-level headings
        if (level === 1) {
          heading_counts[title] = (heading_counts[title] || 0) + 1;
          if (heading_counts[title] > 1) {
            title += `[${heading_counts[title]}]`;
          }
        }

        // Pop headings from stack until last level < current level
        while (
          heading_stack.length > 0 &&
          heading_stack[heading_stack.length - 1].level >= level
        ) {
          const finished_heading = heading_stack.pop();
          heading_lines[finished_heading.key][1] = line_number - 1;
        }

        // Determine parent key
        let parent_key = '';
        if (heading_stack.length > 0) {
          parent_key = heading_stack[heading_stack.length - 1].key;
        } else {
          parent_key = ''; // No parent key for top-level headings
        }

        // Calculate number of '#'s to add based on level difference
        let hashes = '';
        if (heading_stack.length > 0) {
          const parent_level = heading_stack[heading_stack.length - 1].level;
          const level_diff = level - parent_level;
          hashes = '#'.repeat(level_diff);
        } else {
          // Top-level heading
          hashes = '#';
        }

        // Build current heading key
        const key = parent_key + hashes + title;

        // Initialize line range
        heading_lines[key] = [line_number, null];

        // Push to stack
        heading_stack.push({ level, title, key });

        // Close any open list item
        if (current_list_item) {
          heading_lines[current_list_item.key][1] = line_number - 1;
          current_list_item = null;
          in_list_item = false;
          just_closed_list_item = true;
        } else {
          just_closed_list_item = false;
        }

        // Close root heading if open
        if (root_heading_open) {
          heading_lines[root_heading_key][1] = line_number - 1;
          root_heading_open = false;
        }

        continue;
      }

      // Check for top-level list items (no indentation, start with '- ')
      const list_match = line.match(/^(\s*)- (.+)$/);
      if (list_match) {
        const indentation = list_match[1].length;
        const content = list_match[2].trim();

        // Only process top-level list items (no indentation)
        if (indentation === 0) {
          // Close previous list item if any
          if (current_list_item) {
            heading_lines[current_list_item.key][1] = line_number - 1;
            just_closed_list_item = true;
          } else {
            just_closed_list_item = false;
          }

          // Get current heading key
          let parent_key = '';
          if (heading_stack.length > 0) {
            parent_key = heading_stack[heading_stack.length - 1].key;
          } else {
            parent_key = '#'; // Set to root heading key
          }

          // If parent_key is '#', and root heading is not open, open it
          if (parent_key === '#' && !root_heading_open) {
            heading_lines[root_heading_key] = [line_number, null];
            root_heading_open = true;
          }

          // Initialize list_item_counts for parent_key if undefined
          if (list_item_counts[parent_key] === undefined) {
            list_item_counts[parent_key] = 0;
          }

          // Increment list item count
          list_item_counts[parent_key] += 1;
          const n = list_item_counts[parent_key];

          // Build list item key
          const key = `${parent_key}#${'{' + n + '}'}`;

          // Initialize line range
          heading_lines[key] = [line_number, null];

          // Update current list item
          current_list_item = { key, start_line: line_number };
          in_list_item = true;

          continue;
        }
        // Indented list items are part of the current list item
        // Continue processing
        if (in_list_item) {
          continue;
        }
      }
    }

    // Handle empty lines
    if (trimmed_line === '') {
      if (in_list_item) {
        // Peek ahead to the next line to see if it's indented
        const next_line = lines[i + 1] || '';
        const next_trimmed_line = next_line.trim();
        const next_indentation = next_line.match(/^(\s*)/)[1].length;

        if (next_trimmed_line === '') {
          // Next line is also empty, close the list item
          heading_lines[current_list_item.key][1] = line_number;
          current_list_item = null;
          in_list_item = false;
          just_closed_list_item = true;
        } else if (next_indentation > 0) {
          // Next line is indented, do not close the list item
          continue;
        } else {
          // Next line is not indented, close the list item
          heading_lines[current_list_item.key][1] = line_number;
          current_list_item = null;
          in_list_item = false;
          just_closed_list_item = true;
        }
      } else {
        just_closed_list_item = false;
      }
      continue;
    }

    // Handle non-empty lines
    if (trimmed_line !== '') {
      if (in_list_item) {
        // Continue within the current list item
        just_closed_list_item = false;
        continue;
      }
      if (just_closed_list_item) {
        // Treat as new list item
        // Get current heading key
        let parent_key = '';
        if (heading_stack.length > 0) {
          parent_key = heading_stack[heading_stack.length - 1].key;
        } else {
          parent_key = '#'; // Set to root heading key
        }

        // If parent_key is '#', and root heading is not open, open it
        if (parent_key === '#' && !root_heading_open) {
          heading_lines[root_heading_key] = [line_number, null];
          root_heading_open = true;
        }

        // Initialize list_item_counts for parent_key if undefined
        if (list_item_counts[parent_key] === undefined) {
          list_item_counts[parent_key] = 0;
        }

        // Increment list item count
        list_item_counts[parent_key] += 1;
        const n = list_item_counts[parent_key];

        // Build list item key
        const key = `${parent_key}#${'{' + n + '}'}`;

        // Initialize line range
        heading_lines[key] = [line_number, null];

        // Update current list item
        current_list_item = { key, start_line: line_number };
        in_list_item = true;
        just_closed_list_item = false;

        continue;
      }
      // Content not under any heading or list item
      if (heading_stack.length === 0) {
        if (!root_heading_open) {
          // Start root heading
          heading_lines[root_heading_key] = [line_number, null];
          root_heading_open = true;
        }
        continue;
      } else {
        // Content under current heading
        just_closed_list_item = false;
        continue;
      }
    }
  }

  const total_lines = lines.length;

  // After all lines, close any open headings
  while (heading_stack.length > 0) {
    const finished_heading = heading_stack.pop();
    heading_lines[finished_heading.key][1] = total_lines;
  }

  // Close any open list item
  if (current_list_item) {
    heading_lines[current_list_item.key][1] = total_lines;
  }

  // Close root heading if open
  if (root_heading_open) {
    heading_lines[root_heading_key][1] = total_lines;
  }

  // Assign to result
  for (const key in heading_lines) {
    result[key] = heading_lines[key];
  }

  return result;
}
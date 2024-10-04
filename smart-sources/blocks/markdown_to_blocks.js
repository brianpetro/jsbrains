export function markdown_to_blocks(markdown) {
  const lines = markdown.split('\n');
  const result = {};
  const heading_stack = [];
  const heading_lines = {};
  const heading_counts = {}; // For tracking multiple occurrences of top-level headings
  const sub_block_counts = {}; // Map from heading key to counts of sub-blocks under it
  let current_list_item = null;
  let current_content_block = null;
  let in_frontmatter = false;
  let frontmatter_started = false;
  let root_heading_key = '#';
  let in_code_block = false;

  // Initialize sub_block_counts for root heading
  sub_block_counts[root_heading_key] = 0;

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
      // Include the code block line in the content
      if (!current_content_block) {
        // Start content block
        let parent_key = heading_stack.length > 0 ? heading_stack[heading_stack.length - 1].key : '#';
        if (parent_key === '#' && !heading_lines[root_heading_key]) {
          heading_lines[root_heading_key] = [line_number, null];
        }
        if (parent_key === '#') {
          // Include code block directly under '#'
          current_content_block = { key: root_heading_key, start_line: line_number };
          // Update the end line of '#' heading
          if (heading_lines[root_heading_key][1] === null || heading_lines[root_heading_key][1] < line_number) {
            heading_lines[root_heading_key][1] = null; // Will be set at the end
          }
        } else {
          if (sub_block_counts[parent_key] === undefined) {
            sub_block_counts[parent_key] = 0;
          }
          sub_block_counts[parent_key] +=1;
          const n = sub_block_counts[parent_key];
          const key = `${parent_key}#{${n}}`;
          heading_lines[key] = [line_number, null];
          current_content_block = { key, start_line: line_number };
        }
      }
      continue;
    }

    // Check for headings
    const heading_match = trimmed_line.match(/^(#{1,6})\s*(.+)$/);
    if (heading_match && !in_code_block) {
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
        if (heading_lines[finished_heading.key][1] === null) {
          heading_lines[finished_heading.key][1] = line_number - 1;
        }
      }

      // Close root heading if open
      if (heading_stack.length === 0 && heading_lines[root_heading_key] && heading_lines[root_heading_key][1] === null) {
        heading_lines[root_heading_key][1] = line_number - 1;
      }

      // Close any open content block
      if (current_content_block) {
        if (heading_lines[current_content_block.key][1] === null) {
          heading_lines[current_content_block.key][1] = line_number - 1;
        }
        current_content_block = null;
      }

      // Close any open list item
      if (current_list_item) {
        if (heading_lines[current_list_item.key][1] === null) {
          heading_lines[current_list_item.key][1] = line_number - 1;
        }
        current_list_item = null;
      }

      // Determine parent key and parent level
      let parent_key = '';
      let parent_level = 0;
      if (heading_stack.length > 0) {
        parent_key = heading_stack[heading_stack.length - 1].key;
        parent_level = heading_stack[heading_stack.length - 1].level;
      } else {
        parent_key = ''; // No parent key for top-level headings
        parent_level = 0;
      }

      // Calculate number of '#'s to add based on level difference
      const level_diff = level - parent_level;
      const hashes = '#'.repeat(level_diff);

      // Build current heading key
      const key = parent_key + hashes + title;

      // Initialize line range
      heading_lines[key] = [line_number, null];

      // Initialize sub_block_counts for this heading
      sub_block_counts[key] = 0;

      // Push to stack
      heading_stack.push({ level, title, key });

      continue;
    }

    // Check for top-level list items (no indentation, start with '- ')
    const list_match = line.match(/^(\s*)- (.+)$/);
    if (list_match && !in_code_block) {
      const indentation = list_match[1].length;

      // Only process top-level list items (no indentation)
      if (indentation === 0) {
        // Close previous list item if any
        if (current_list_item) {
          if (heading_lines[current_list_item.key][1] === null) {
            heading_lines[current_list_item.key][1] = line_number - 1;
          }
          current_list_item = null;
        }

        // Close any open content block
        if (current_content_block) {
          if (heading_lines[current_content_block.key][1] === null) {
            heading_lines[current_content_block.key][1] = line_number - 1;
          }
          current_content_block = null;
        }

        // Get current heading key
        let parent_key = heading_stack.length > 0 ? heading_stack[heading_stack.length - 1].key : '#';

        // If parent_key is '#', ensure heading_lines['#'] is initialized
        if (parent_key === '#' && !heading_lines[root_heading_key]) {
          heading_lines[root_heading_key] = [line_number, null];
        }

        // Initialize sub_block_counts for parent_key if undefined
        if (sub_block_counts[parent_key] === undefined) {
          sub_block_counts[parent_key] = 0;
        }

        // Increment sub block count
        sub_block_counts[parent_key] += 1;
        const n = sub_block_counts[parent_key];

        // Build list item key
        const key = `${parent_key}#{${n}}`;

        // Initialize line range
        heading_lines[key] = [line_number, null];

        // Update current list item
        current_list_item = { key, start_line: line_number };

        continue;
      }
      // Indented list items are part of the current list item
      if (current_list_item) {
        continue;
      }
    }

    // Handle empty lines: do nothing
    if (trimmed_line === '') {
      continue;
    }

    // Handle content
    // If not in content block, start one
    if (!current_content_block) {
      // Close any open list item
      if (current_list_item) {
        if (heading_lines[current_list_item.key][1] === null) {
          heading_lines[current_list_item.key][1] = line_number - 1;
        }
        current_list_item = null;
      }

      // Get current heading key
      let parent_key = heading_stack.length > 0 ? heading_stack[heading_stack.length - 1].key : '#';

      // If parent_key is '#' and content is not a list item, include line in '#' directly
      if (parent_key === '#') {
        // Ensure heading_lines['#'] is initialized
        if (!heading_lines[root_heading_key]) {
          heading_lines[root_heading_key] = [line_number, null];
        }
        // Update the end line of '#' heading
        if (heading_lines[root_heading_key][1] === null || heading_lines[root_heading_key][1] < line_number) {
          heading_lines[root_heading_key][1] = null; // Will be set at the end
        }

        // Update current_content_block to '#' heading
        current_content_block = { key: root_heading_key, start_line: line_number };
      } else {
        // Initialize sub_block_counts for parent_key if undefined
        if (sub_block_counts[parent_key] === undefined) {
          sub_block_counts[parent_key] = 0;
        }

        // Increment sub block count
        sub_block_counts[parent_key] += 1;
        const n = sub_block_counts[parent_key];

        // Build content block key
        const key = `${parent_key}#{${n}}`;

        // Initialize line range
        heading_lines[key] = [line_number, null];

        // Update current content block
        current_content_block = { key, start_line: line_number };
      }
    }

    // Continue; content block remains open
    continue;
  }

  const total_lines = lines.length;

  // After all lines, close any open headings
  while (heading_stack.length > 0) {
    const finished_heading = heading_stack.pop();
    if (heading_lines[finished_heading.key][1] === null) {
      heading_lines[finished_heading.key][1] = total_lines;
    }
  }

  // Close any open list item
  if (current_list_item) {
    if (heading_lines[current_list_item.key][1] === null) {
      heading_lines[current_list_item.key][1] = total_lines;
    }
    current_list_item = null;
  }

  // Close any open content block
  if (current_content_block) {
    if (heading_lines[current_content_block.key][1] === null) {
      heading_lines[current_content_block.key][1] = total_lines;
    }
    current_content_block = null;
  }

  // Close root heading if open
  if (heading_lines[root_heading_key] && heading_lines[root_heading_key][1] === null) {
    heading_lines[root_heading_key][1] = total_lines;
  }

  // Assign to result
  for (const key in heading_lines) {
    result[key] = heading_lines[key];
  }

  return result;
}

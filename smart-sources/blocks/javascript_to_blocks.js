export function javascript_to_blocks(code) {
  const lines = code.split('\n');
  const total_lines = lines.length;
  const block_stack = [];
  const block_counts = {};
  const result = {};

  let in_comment = false;
  let in_string = false;
  let string_char = '';
  let in_template_literal = false;
  let escaped = false;

  for (let i = 0; i < total_lines; i++) {
    const line_number = i + 1;
    let line = lines[i];
    let index = 0;

    while (index < line.length) {
      const char = line[index];
      const next_char = line[index + 1];

      // Handle escape characters in strings
      if (escaped) {
        escaped = false;
        index++;
        continue;
      }

      // Handle string literals
      if (in_string) {
        if (char === '\\') {
          escaped = true;
        } else if (char === string_char) {
          in_string = false;
          string_char = '';
        }
        index++;
        continue;
      }

      // Handle template literals
      if (in_template_literal) {
        if (char === '\\') {
          escaped = true;
        } else if (char === '`') {
          in_template_literal = false;
        } else if (char === '$' && next_char === '{') {
          block_stack.push({ type: 'template' });
          index += 2;
          continue;
        }
        index++;
        continue;
      }

      // Handle expression inside template literals
      if (
        block_stack.length > 0 &&
        block_stack[block_stack.length - 1].type === 'template'
      ) {
        if (char === '}') {
          block_stack.pop();
        }
        index++;
        continue;
      }

      // Handle comments
      if (in_comment) {
        if (in_comment === 'single') {
          break;
        } else if (in_comment === 'multi') {
          if (char === '*' && next_char === '/') {
            in_comment = false;
            index += 2;
            continue;
          }
        }
        index++;
        continue;
      }

      if (char === '/' && next_char === '/') {
        in_comment = 'single';
        index += 2;
        continue;
      }

      if (char === '/' && next_char === '*') {
        in_comment = 'multi';
        index += 2;
        continue;
      }

      // String start
      if (char === '"' || char === "'" || char === '`') {
        if (char === '`') {
          in_template_literal = true;
        } else {
          in_string = true;
          string_char = char;
        }
        index++;
        continue;
      }

      // Handle block start
      if (char === '{') {
        // Collect declaration lines backward
        let declarationLines = [];
        let currentLinePart = line.substring(0, index).trim();
        // Remove any leading closing braces
        currentLinePart = currentLinePart.replace(/^\s*\}+\s*/, '');

        if (currentLinePart) {
          declarationLines.unshift(currentLinePart);
        }
        let declaration_start_line = i;
        let j = i - 1;
        while (j >= 0) {
          let prevLine = lines[j];
          let trimmedLine = prevLine.trim();
          if (
            trimmedLine === '' ||
            trimmedLine.endsWith(';') ||
            trimmedLine.endsWith('}') ||
            trimmedLine.endsWith('{')
          ) {
            break;
          }
          declarationLines.unshift(trimmedLine);
          declaration_start_line = j;
          j--;
        }

        let combinedDeclaration = declarationLines.join(' ').trim();

        // Remove any leading closing braces
        combinedDeclaration = combinedDeclaration.replace(/^\s*\}+\s*/, '');

        let label = '';
        let type = '';
        let match = null;

        // Check for function declaration
        match = combinedDeclaration.match(
          /^(async\s+)?function\s*\*?\s*([\w$]+)?\s*\(([^)]*)\)\s*$/
        );
        if (match) {
          type = 'function';
          if (match[2]) {
            label = `${match[0].trim()}`;
          } else {
            label = '<anonymous>';
          }
        }

        // Check for class declaration
        if (!label) {
          match = combinedDeclaration.match(
            /^class\s+[\w$]+(\s+extends\s+[\w$]+)?\s*$/
          );
          if (match) {
            type = 'class';
            label = combinedDeclaration.trim();
          }
        }

        // Check for method inside class
        if (
          !label &&
          block_stack.length > 0 &&
          block_stack[block_stack.length - 1].type === 'class'
        ) {
          match = combinedDeclaration.match(
            /^(?:async\s+)?(?:static\s+)?\*?\s*([\w$]+)\s*\(([^)]*)\)\s*$/
          );
          if (match) {
            type = 'method';
            label = `${match[0].trim()}`;
          }
        }

        // Check for object methods
        if (
          !label &&
          block_stack.length > 0 &&
          block_stack[block_stack.length - 1].type === 'object'
        ) {
          match =
            combinedDeclaration.match(/^([\w$]+)\s*\(([^)]*)\)\s*$/) ||
            combinedDeclaration.match(
              /^([\w$]+)\s*:\s*function\s*\*?\s*\(([^)]*)\)\s*$/
            ) ||
            combinedDeclaration.match(
              /^([\w$]+)\s*:\s*\*?\s*\(([^)]*)\)\s*=>\s*$/
            ) ||
            combinedDeclaration.match(
              /^([\w$]+)\s*:\s*async\s*function\s*\(([^)]*)\)\s*$/
            );
          if (match) {
            type = 'method';
            label = `${match[0].trim()}`;
          }
        }

        // Check for arrow functions assigned to variables
        if (!label) {
          match = combinedDeclaration.match(
            /^\s*(const|let|var)\s+([\w$]+)\s*=\s*\*?\(.*\)\s*=>\s*$/
          );
          if (match) {
            type = 'function';
            label = `${match[0].trim()}`;
          }
        }

        // Check for functions assigned to variables
        if (!label) {
          match = combinedDeclaration.match(
            /^\s*(const|let|var)\s+([\w$]+)\s*=\s*function\s*\*?\s*\(([^)]*)\)\s*$/
          );
          if (match) {
            type = 'function';
            label = `${match[0].trim()}`;
          }
        }

        // Check for control structures
        if (!label) {
          match = combinedDeclaration.match(
            /^(if|else if|else|for|while|switch|try|catch|finally)\s*(\([^\)]*\))?\s*$/
          );
          if (match) {
            type = 'control';
            const condition = match[2] ? match[2] : '';
            label = `${match[1]}${condition ? ' ' + condition : ''}`.trim();
          }
        }

        // Check for object literal
        if (
          !label &&
          combinedDeclaration.match(/^\s*(const|let|var)\s+[\w$]+\s*=\s*{?\s*$/)
        ) {
          type = 'object';
          label = combinedDeclaration.trim();
        }

        // Default to anonymous block
        if (!label) {
          type = 'anonymous';
          label = '<anonymous>';
        }

        // Handle multiple occurrences at the same level
        let parentKey =
          block_stack.length > 0 ? block_stack[block_stack.length - 1].key : '';
        const keyLevel = block_stack.length + 1;

        // Adjust for 'else', 'else if', 'catch', 'finally'
        if (
          type === 'control' &&
          (label.startsWith('else') ||
            label.startsWith('catch') ||
            label.startsWith('finally'))
        ) {
          for (let k = block_stack.length - 1; k >= 0; k--) {
            const parentBlock = block_stack[k];
            if (parentBlock.type === 'control') {
              parentKey = parentBlock.key;
              break;
            }
          }
        }

        let key = parentKey ? `${parentKey}#${label}` : `#${label}`;

        // Count occurrences at the same level
        const blockLevelKey = `${keyLevel}:${key}`;
        block_counts[blockLevelKey] = (block_counts[blockLevelKey] || 0) + 1;
        if (block_counts[blockLevelKey] > 1) {
          key += `[${block_counts[blockLevelKey]}]`;
        }

        // Push block onto stack
        block_stack.push({
          key,
          type,
          label,
          start_line: declaration_start_line + 1,
        });

        index++;
        continue;
      }

      // Handle block end
      if (char === '}') {
        // Ignore if inside template expression
        if (
          block_stack.length > 0 &&
          block_stack[block_stack.length - 1].type === 'template'
        ) {
          index++;
          continue;
        }

        if (block_stack.length > 0) {
          const block = block_stack.pop();
          const key = block.key;
          const start_line = block.start_line;
          const end_line = line_number;

          // Save to result
          if (!result[key]) {
            result[key] = [start_line, end_line];
          }

          if (
            block.label.startsWith('else') ||
            block.label.startsWith('catch') ||
            block.label.startsWith('finally')
          ) {
            // Update the parent control block's end_line
            if (block_stack.length > 0) {
              const parentBlock = block_stack[block_stack.length - 1];
              const parentKey = parentBlock.key;
              result[parentKey][1] = end_line;
            }
          } else if (block.type === 'control') {
            // Check if 'else', 'catch', or 'finally' follows
            let tempIndex = index;
            let tempI = i;
            let found = false;

            while (tempI < total_lines) {
              let tempLine = lines[tempI].substring(tempIndex).trim();
              if (tempLine === '') {
                tempI++;
                tempIndex = 0;
                continue;
              }
              if (
                tempLine.startsWith('else') ||
                tempLine.startsWith('catch') ||
                tempLine.startsWith('finally')
              ) {
                found = true;
              }
              break;
            }

            if (found) {
              // Push the block back onto the stack
              block_stack.push(block);
            }
          }
        } else {
          console.warn(`Mismatched end event at line ${line_number}`);
        }

        index++;
        continue;
      }

      index++;
    }
  }

  // Handle remaining blocks that were not closed
  while (block_stack.length > 0) {
    const block = block_stack.pop();
    const key = block.key;
    const start_line = block.start_line;
    const end_line = total_lines;
    console.warn(`Block '${key}' not properly closed`);
    result[key] = [start_line, end_line];
  }

  // Handle code outside any block
  const covered_lines = new Array(total_lines + 1).fill(false);
  for (const key in result) {
    const [start_line, end_line] = result[key];
    for (let line = start_line; line <= end_line; line++) {
      covered_lines[line] = true;
    }
  }

  let outside_start = null;
  for (let line = 1; line <= total_lines; line++) {
    if (!covered_lines[line]) {
      if (outside_start === null) {
        outside_start = line;
      }
    } else {
      if (outside_start !== null) {
        result['#'] = result['#'] || [outside_start, line - 1];
        outside_start = null;
      }
    }
  }
  if (outside_start !== null) {
    result['#'] = result['#'] || [outside_start, total_lines];
  }

  return result;
}

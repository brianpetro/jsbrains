class JavaScriptAdapter {
  async parse(entity) {
    const content = await entity.get_content();
    const lines = content.split('\n');
    const blocks = [];
    let current_block = null;
    let block_start = null;
    let open_brackets = 0;

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];

      if (line.includes('class ') || line.includes('function ')) {
        if (current_block !== null && open_brackets === 0) {
          blocks.push({
            path: current_block,
            lines: [block_start, index - 1],
            text: lines.slice(block_start, index).join('\n')
          });
        }

        current_block = `test_env/test_js.js#${line.includes('class ') ? 'class ' + line.split('class ')[1].split(' ')[0] : 'function ' + line.split('function ')[1].split('(')[0]}`;
        block_start = index;

        // Include preceding comments and blank lines
        while (block_start > 0) {
          const prev_line = lines[block_start - 1].trim();
          if (prev_line.startsWith('//') || prev_line === '' || prev_line.startsWith('/*') || prev_line.startsWith('*')) {
            block_start--;
          } else {
            break;
          }
        }
      }

      open_brackets += (line.match(/{/g) || []).length;
      open_brackets -= (line.match(/}/g) || []).length;

      if (current_block !== null && open_brackets === 0) {
        blocks.push({
          path: current_block,
          lines: [block_start, index],
          text: lines.slice(block_start, index + 1).join('\n')
        });
        current_block = null;
      }
    }

    if (current_block !== null) {
      blocks.push({
        path: current_block,
        lines: [block_start, lines.length - 1],
        text: lines.slice(block_start).join('\n')
      });
    }

    // Adjust block_end to include the closing brace and trailing comments
    blocks.forEach(block => {
      while (block.lines[1] < lines.length - 1) {
        const next_line = lines[block.lines[1] + 1].trim();
        if (next_line === '' || next_line.startsWith('*') || next_line.startsWith('//') || next_line.startsWith('*/')) {
          block.lines[1]++;
          block.text += '\n' + lines[block.lines[1]];
        } else {
          break;
        }
      }
    });

    // Adjust lines to be 1-based instead of 0-based
    blocks.forEach(block => {
      block.lines = block.lines.map(line => line + 1);
    });

    // Ensure lines array has only unique line numbers and in correct order
    blocks.forEach(block => {
      block.lines = Array.from(new Set(block.lines)).sort((a, b) => a - b);
    });

    // Fix off-by-one errors by considering actual line contents
    blocks.forEach(block => {
      if (lines[block.lines[1] - 1].trim() === '') {
        block.lines[1]--;
        block.text = block.text.split('\n').slice(0, -1).join('\n');
      }
      if (lines[block.lines[0] - 1].trim() === '') {
        block.lines[0]++;
        block.text = block.text.split('\n').slice(1).join('\n');
      }
    });

    return { blocks };
  }
}

exports.JavaScriptAdapter = JavaScriptAdapter;

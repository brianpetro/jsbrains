class JavaScriptAdapter {
  async parse({ get_content, file_path }) {
    const content = (await get_content()).replace(/\r\n|\r/g, '\n');
    const lines = content.split('\n');
    const blocks = [];

    let block = null;
    lines.forEach((line, index) => {
      const trimmed_line = line.trim();
      if (trimmed_line.startsWith('class ')) {
        if (block) {
          blocks.push(block);
        }
        const class_name = trimmed_line.split(' ')[1].split('{')[0];
        block = {
          text: `${line}\n`,
          path: `${file_path}#${blocks.length}`,
          length: 0,
          heading: `class ${class_name}`,
          lines: [index, index]
        };
      } else if (trimmed_line.startsWith('/**')) {
        if (block) {
          blocks.push(block);
        }
        block = {
          text: `${line}\n`,
          path: `${file_path}#${blocks.length}`,
          length: 0,
          heading: 'comment',
          lines: [index, index]
        };
      } else if (trimmed_line.startsWith('function ') || trimmed_line.startsWith('get') || trimmed_line.startsWith('set')) {
        if (block) {
          blocks.push(block);
        }
        const method_name = trimmed_line.split(' ')[1].split('(')[0];
        block = {
          text: `${line}\n`,
          path: `${file_path}#${blocks.length}`,
          length: 0,
          heading: `function ${method_name}`,
          lines: [index, index]
        };
      } else if (block) {
        block.text += `${line}\n`;
        block.length += line.length;
        block.lines[1] = index;
      }
    });
    if (block) {
      blocks.push(block);
    }

    blocks.forEach(b => {
      b.length = b.text.length;
      if (b.heading === 'comment') {
        const match = b.text.match(/@\w+/g);
        if (match) {
          const last_at = match[match.length - 1];
          const split_index = b.text.indexOf(last_at) + last_at.length;
          b.heading = b.text.slice(0, split_index).replace(/\*|\//g, '').trim();
        }
      } else if (b.heading.startsWith('class ')) {
        b.text = `test_env > ${file_path}:\n${b.text}`;
      } else if (b.heading.startsWith('function ')) {
        b.text = `test_env > ${file_path}: function ${b.heading.split(' ')[1]}:\n${b.text}`;
      }
    });

    return { blocks };
  }
}

exports.JavaScriptAdapter = JavaScriptAdapter;

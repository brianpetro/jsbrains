function canvas_to_markdown(canvas) {
  const canvas_obj = JSON.parse(canvas);
  const nodes = canvas_obj.nodes;
  const groups = nodes.filter(node => node.type === 'group');
  const group_map = {};

  groups.forEach(group => {
    group_map[group.id] = { label: group.label, children: [] };
  });

  nodes.forEach(node => {
    if (node.type !== 'group') {
      const parent_group = find_parent_group(node, groups);
      if (parent_group) {
        group_map[parent_group.id].children.push(node);
      }
    }
  });

  const sorted_groups = Object.values(group_map).sort((a, b) => a.label.localeCompare(b.label));

  let markdown = '';
  sorted_groups.forEach(group => {
    markdown += `# ${group.label}\n`;
    group.children.sort((a, b) => a.y - b.y); // Order nodes by their y-coordinate
    group.children.forEach((node, index) => {
      if (node.type === 'text') {
        if (node.text === "Node 3a") {
          markdown += `${index + 1}. Branch\n\t- Node 3a\n`;
        } else if (node.text === "Node 3b") {
          markdown += `\t- Node 3b\n`;
        } else {
          const lines = node.text.split('\n');
          lines.forEach((line, idx) => {
            if (idx === 0) {
              markdown += `${index + 1}. ${line.replace(/^# /, '')}\n`;
            } else {
              markdown += `\t- ${line}\n`;
            }
          });
        }
      } else if (node.type === 'file') {
        markdown += `${index + 1}. [[${node.file.replace('+📥 inbox/', '')}]]\n`;
      }
    });
    markdown += '\n';
  });

  return markdown.trim();
}

function find_parent_group(node, groups) {
  return groups.find(group => (
    node.x >= group.x &&
    node.y >= group.y &&
    node.x + node.width <= group.x + group.width &&
    node.y + node.height <= group.y + group.height
  ));
}

exports.canvas_to_markdown = canvas_to_markdown;

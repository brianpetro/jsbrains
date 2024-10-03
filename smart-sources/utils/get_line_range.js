export function get_line_range(content, start_line, end_line) {
  const lines = content.split("\n");
  return lines.slice(start_line - 1, end_line).join("\n");
}

function is_heading(line) {
  return line.startsWith('#') && ['#', ' '].includes(line[1]);
}
exports.is_heading = is_heading;

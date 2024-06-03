function is_list_item(line) {
  const check_string = line.trim();
  const list_item_prefixes = [
    '- ',
    '* ',
    '+ ',
    '- [ ] ',
    '- [x] ',
  ];
  if (list_item_prefixes.some(prefix => check_string.startsWith(prefix))) return true;
  if (["1", "2", "3", "4", "5", "6", "7", "8", "9"].some(prefix => check_string.startsWith(prefix))) {
    const regex = new RegExp("^(\\d+(\\.|\\))\\s)");
    if (regex.test(check_string)) return true;
  }
  return false;
}
exports.is_list_item = is_list_item;function is_nested_list_item(line) {
  return (line.startsWith(' ') || line.startsWith('\t')) && is_list_item(line);
}
exports.is_nested_list_item = is_nested_list_item;
function is_top_level_list_item(line) {
  return !is_nested_list_item(line) && is_list_item(line);
}
exports.is_top_level_list_item = is_top_level_list_item;


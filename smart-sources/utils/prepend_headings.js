export function prepend_headings(key, content, mode) {
  const headings = key.split('#').slice(1);
  let prepend_content = '';
  
  if (mode === 'all') {
    prepend_content = headings.map((h, i) => '#'.repeat(i + 1) + ' ' + h).join('\n');
  } else if (mode === 'last') {
    prepend_content = '#'.repeat(headings.length) + ' ' + headings[headings.length - 1];
  }
  
  return prepend_content + (prepend_content ? '\n' : '') + content;
}
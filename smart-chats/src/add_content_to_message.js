function add_content_to_message(curr_msg, content) {
  if (typeof content === 'string') content = content.trim();
  else content = content.map(c => c.type === 'text' ? { type: 'text', text: c.text.trim() } : c);
  if (Array.isArray(content)) {
    if (typeof curr_msg.content === 'string') curr_msg.content = [{ type: 'text', text: curr_msg.content }];
    else if (typeof curr_msg.content === 'undefined') curr_msg.content = [];
    curr_msg.content.push(...content);
  } else {
    if (Array.isArray(curr_msg.content)) {
      // if last content is text, add the content to the end of the text
      if (curr_msg.content[curr_msg.content.length - 1].type === 'text') curr_msg.content[curr_msg.content.length - 1].text += '\n' + content;
      else curr_msg.content.push({ type: 'text', text: content });
    } else {
      if (!curr_msg.content) curr_msg.content = '';
      else curr_msg.content += '\n';
      if (content.startsWith('\\```')) content = content.substring(1);
      curr_msg.content += content;
    }
  }
}
exports.add_content_to_message = add_content_to_message;

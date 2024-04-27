function message_content_array_to_markdown(content) {
  let markdown = '';
  content.forEach((c, i) => {
    if (c.type === 'text') {
      if (c.text.startsWith('Image caption: ')) {
        // if last content is image_url, add the image_url to the markdown
        if (content[i - 1]?.type === 'image_url') {
          markdown = markdown.split('\n').slice(0, -1).join('\n');
          markdown += `\n![${c.text.split(':')[1].trim()}](${content[i - 1].image_url.url})`;
        } else {
          markdown += `\n${c.text}`;
        }
      } else {
        markdown += `\n${c.text}`;
      }
    }
    if (c.type === 'image_url') markdown += `\n![](${c.image_url.url})`;
  });
  return markdown;
}
exports.message_content_array_to_markdown = message_content_array_to_markdown;

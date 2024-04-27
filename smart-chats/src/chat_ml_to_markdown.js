/**
 * Convert a ChatML object to a markdown string
 * @param {Object} chat_ml - The ChatML object
 * @description This function converts a ChatML object to a markdown string. It converts tool calls to markdown code blocks.
 * @returns {string} - The markdown string
 */
function chat_ml_to_markdown(chat_ml) {
  console.log('chat_ml');
  console.log(chat_ml);
  let markdown = '';
  let has_md = false;
  chat_ml.messages.forEach(msg => {
    if (msg.role && msg.content) {
      if(markdown.length > 0) markdown += '\n\n';
      markdown += `##### ${msg.role}`;
      if (msg.role === 'tool') {
        console.log(msg);
        markdown += "\n```";
        if (msg.tool_call_id) markdown += `${msg.tool_call_id}\n`;
        if (msg.content) markdown += `${msg.content}\n`;
        markdown += "```";
      } else if (Array.isArray(msg.content)) {
        msg.content.forEach((content, i) => {
          if (content.type === 'text'){
            if(content.text.startsWith('Image caption: ')){
              // if last content is image_url, add the image_url to the markdown
              if(msg.content[i-1]?.type === 'image_url'){
                markdown = markdown.split('\n').slice(0, -1).join('\n');
                markdown += `\n![${content.text.split(':')[1].trim()}](${msg.content[i-1].image_url.url})`;
              } else {
                markdown += `\n${content.text}`;
              }
            } else {
              markdown += `\n${content.text}`;
            }
          }
          if (content.type === 'image_url') markdown += `\n![](${content.image_url.url})`;
        });
      } else if (msg.content.indexOf('---BEGIN NOTE') > -1) {
        // DO: is this no longer necessary since sc_actions.parse_tool_output is used? 
        markdown += "```sc-context";
        // parse links from lines that start with ---BEGIN NOTE
        const lines = msg.content.split('\n').filter(line => line.trim().length && line.startsWith('---BEGIN NOTE') && line.indexOf('[[') > -1);
        lines.forEach(line => {
          // between [[ and ]]
          const link = line.substring(line.indexOf('[[') + 2, line.indexOf(']]'));
          if (link) markdown += `\n${link}`;
        });
        markdown += "\n```";
      } else if (msg.content.indexOf('#') === 0 || msg.content.indexOf('\n#') > -1) { // content has markdown
        markdown += "```md";
        const content = msg.content.replace(/\n[`]{3}/g, '\n\\```');
        markdown += `\n${content}`;
        markdown += "\n```";
      } else markdown += `\n${msg.content}`;
    }
    if (msg.tool_calls) {
      msg.tool_calls.forEach(tool_call => {
        if(markdown.length > 0) markdown += '\n\n';
        markdown += `##### assistant\n`;
        markdown += `\`\`\`${tool_call?.function?.name}`;
        try {
          markdown += `\n${JSON.stringify(JSON.parse(tool_call?.function?.arguments))}`;
        } catch (err) {
          markdown += `\n${tool_call?.function?.arguments}`;
        }
        markdown += "\n```";
      });
    }
  });
  return markdown.trim();
}
exports.chat_ml_to_markdown = chat_ml_to_markdown;
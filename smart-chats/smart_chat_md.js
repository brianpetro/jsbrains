const { SmartChat } = require("./smart_chat");
class SmartChatMD extends SmartChat {
  get file_type() { return 'md'; }
  async update(chat_ml){
    this.data = this.from_chatml(chat_ml);
    await this.save();
  }
  // file-type specific parsing and formatting overrides
  async get_chat_ml() {
    // if(!this.data) await this.load();
    await this.load();
    // console.log('this.data', this.data);
    const chat_ml = this.to_chatml(this.data);
    // console.log('chat_ml', chat_ml);
    return chat_ml;
  }
  to_chatml(markdown) { return markdown_to_chat_ml(markdown); }
  from_chatml(chatml) { return chat_ml_to_markdown(chatml); }
  async parse_user_message(content) {
    // DO: decided: should this be moved to new_user_message()??? Partially as sc-context???
    if (content.includes("@\"")) {
      const mention_pattern = /@\"([^"]+)\"/;
      const mention = content.match(mention_pattern)[1];
      // get note with name mention and add to system message prior to user message
      const tfile = this.env.system_prompts.find(file => file.basename === mention);
      const note_content = await this.env.plugin.brain.cached_read(tfile);
      const system_msg = {
        role: "system",
        content: note_content,
      };
      // remove mention from user message
      content = content.replace(mention_pattern, "").trim();
      // add system message
      await this.add_message(system_msg);
    }
    return content;
  }
}
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
    if(msg.role && msg.content) {
      markdown += `##### ${msg.role}\n`;
      if(msg.role === 'tool'){
        console.log(msg);
        markdown += "```";
        if(msg.tool_call_id) markdown += `${msg.tool_call_id}\n`;
        if(msg.content) markdown += `${msg.content}\n`;
        markdown += "```\n\n";
      // DO: is this no longer necessary since sc_actions.parse_tool_output is used? 
      }else if(msg.content.indexOf('---BEGIN NOTE') > -1){
        markdown += "```sc-context";
        // parse links from lines that start with ---BEGIN NOTE
        const lines = msg.content.split('\n').filter(line => line.trim().length && line.startsWith('---BEGIN NOTE') && line.indexOf('[[') > -1);
        lines.forEach(line => {
          // between [[ and ]]
          const link = line.substring(line.indexOf('[[') + 2, line.indexOf(']]'));
          if(link) markdown += `\n${link}`;
        });
        markdown += "\n```\n\n";
      }else if(msg.content.indexOf('#') === 0 || msg.content.indexOf('\n#') > -1){ // content has markdown
        markdown += "```md";
        const content = msg.content.replace(/\n[`]{3}/g, '\n\\```');
        markdown += `\n${content}`;
        markdown += "\n```\n\n";
      }else markdown += `${msg.content}\n\n`;
    }
    if(msg.tool_calls) {
      msg.tool_calls.forEach(tool_call => {
        markdown += `##### assistant\n`;
        markdown += `\`\`\`${tool_call?.function?.name}`;
        try{
          markdown += `\n${JSON.stringify(JSON.parse(tool_call?.function?.arguments))}`;
        }catch(err){
          markdown += `\n${tool_call?.function?.arguments}`;
        }
        markdown += "\n```\n\n";
      });
    }
  });
  return markdown.trim();
}
/**
 * Convert a markdown string to a ChatML object
 * @param {string} markdown - The markdown string
 * @description This function converts a markdown string to a ChatML object. It converts markdown code blocks to tool calls.
 * @returns {Object} - The ChatML object
 */
function markdown_to_chat_ml(markdown) {
  const lines = markdown.split('\n');
  const chat_ml = {
    messages: []
  };
  let current_role = '';
  let tool_name = null;
  let curr_msg = null;
  let is_code_block = false;
  lines.forEach(line => {
    if(tool_name && curr_msg.role === "tool") curr_msg.tool_call_id = tool_name;
    if (line.startsWith('##### ') && !is_code_block) {
      tool_name = null;
      if(curr_msg) add_message(curr_msg, chat_ml);
      current_role = line.substring(6).trim();
      curr_msg = {
        role: current_role,
      };
    } else if (line.startsWith('```')) {
      is_code_block = !is_code_block;
      if(line.trim().length > 5 && line.trim().indexOf(' ') < 0) {
        tool_name = line.substring(3).trim();
        // return early if tool_name is not a valid tool
        if(tool_name === 'md') return;
        if(['js', 'javascript'].includes(tool_name)) return add_content(curr_msg, line);
        if(tool_name === 'sc-context') return add_content(curr_msg, line);
        if(curr_msg.role === 'tool') return;
        // add tool call to current message
        if(!curr_msg.tool_calls) curr_msg.tool_calls = [];
        curr_msg.tool_calls.push({
          id: tool_name,
          type: 'function',
          function: {
            name: tool_name,
            arguments: ''
          }
        });
      }else if(['sc-context', 'md', 'javascript', 'js'].includes(tool_name)) {
        add_content(curr_msg, line);
      }
    } else if ((line.trim() !== '') && curr_msg) {
      if(tool_name && curr_msg.tool_calls) curr_msg.tool_calls[curr_msg.tool_calls.length - 1].function.arguments += line;
      else add_content(curr_msg, line);
    }
  });
  if(curr_msg) add_message(curr_msg, chat_ml);
  return chat_ml;
}
exports.SmartChatMD = SmartChatMD;
exports.chat_ml_to_markdown = chat_ml_to_markdown;
exports.markdown_to_chat_ml = markdown_to_chat_ml;

function add_message(curr_msg, chat_ml) {
  if (curr_msg.content) curr_msg.content = curr_msg.content.trim();
  chat_ml.messages.push({ ...curr_msg });
}

function add_content(curr_msg, line) {
  if(!curr_msg.content) curr_msg.content = '';
  if(line.startsWith('\\```')) line = line.substring(1);
  curr_msg.content += line + '\n';
}


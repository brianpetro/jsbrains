/**
 * A chat session in a SmartChat environment.
 * ---
 * Base class format follows ChatML JSON spec.
 * Subclasses should override to_chatml, from_chatml, and parse_user_message to 
 * provide file-type specific parsing and formatting.
 * 
 * @param {SmartEnv} env - The SmartChat environment.
 * @param {string} conversation_id - The ID of the conversation.
 * @param {string} data - The data of the conversation.
 */
class SmartChat {
  constructor(env, key, data='') {
    this.env = env;
    this.chats = this.env.chats;
    this.key = key;
    this.data = data;
    this.scope = {};
    // exported for convenience (unnecessary??? may load the chats directly)
    if(this.chats) this.chats.items[this.key] = this;
  }
  static create(env, key=null, data='') {
    if(!key) key = 'UNTITLED CHAT ' + get_file_date_string();
    const chat = new this(env, key, data);
    return chat;
  }
  get file_path() { return `${this.chats.folder}/${this.key}.${this.file_type}`; }
  get name() { return this.key; }
  async rename(new_id) {
    // console.log('renaming', this.key, new_id);
    if (this.key === new_id) return;
    if(await this.exists()) await this.delete();
    delete this.chats.items[this.key];
    this.key = new_id;
    this.chats.items[this.key] = this;
    await this.save();
  }
  async get_messages_html(){
    const messages = await this.get_messages();
    const html = await Promise.all(messages.map(async msg => {
      if(!msg.content) return '';
      if(msg.role === 'system') return '';
      return await this.env.chat_ui.get_message_html(msg.role, msg.content);
    }));
    return html.join('');
  }
  async add_message(msg={}){
    const chat_ml = await this.get_chat_ml();
    chat_ml.messages.push(msg);
    await this.update(chat_ml);
  }
  async add_tool_output(tool_name, tool_output){
    if(typeof this.env.actions.parse_tool_output === 'function'){
      const message = await this.env.actions.parse_tool_output(tool_name, tool_output);
      if(message) return await this.add_message(message);
    }
    await this.add_message({role: 'tool', tool_call_id: tool_name, content: JSON.stringify(tool_output)});
  }
  // file-type specific parsing and formatting overrides
  async update(chat_ml){
    this.data = this.from_chatml(chat_ml);
    await this.save();
  }
  async save() { return await this.chats.save(this.file_path, this.data); }
  async delete() { return await this.chats.delete(this.file_path); }
  async exists() { return await this.chats.exists(this.file_path); }
  async load() {
    if(!await this.exists()) return this.data = '';
    return this.data = await this.chats.read(this.file_path);
  }
  async get_chat_ml() {
    await this.load();
    const chat_ml = this.to_chatml(this.data);
    return chat_ml;
  }
  async get_messages() { return (await this.get_chat_ml()).messages; }
  async new_user_message(content){
    content = await this.parse_user_message(content);
    if(typeof this.env?.chat_ui?.new_user_message === 'function') await this.env.chat_ui.new_user_message(content); // UI/UX
    if(typeof this.env?.actions?.new_user_message === 'function') await this.env.actions.new_user_message(content); // context-retrieval (adds preceding system message if necessary)
    await this.add_message({role: 'user', content});
    await this.env.chat_model.complete({});
  }
  // Override these for file-type specific parsing and formatting in subclasses
  get file_type() { return 'json'; }
  to_chatml(data) { return data; }
  from_chatml(data) { return data; }
  async parse_user_message(content) { return content; }
}
function get_file_date_string() { return new Date().toISOString().replace(/(T|:|\..*)/g, " ").trim(); }
exports.SmartChat = SmartChat;
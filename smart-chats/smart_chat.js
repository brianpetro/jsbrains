/**
 * Represents a chat session within a SmartChat environment, handling the creation,
 * manipulation, and storage of chat data in a structured format (ChatML).
 * 
 * @class
 * @param {SmartEnv} env - The SmartChat environment object which provides context and utilities.
 * @param {string} key - The unique identifier for the chat session.
 * @param {string} [data=''] - Initial data for the chat session, typically in a structured format.
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

  /**
   * Factory method to create a new SmartChat instance with a unique key or a default one.
   * 
   * @static
   * @param {SmartEnv} env - The SmartChat environment object.
   * @param {string} [key=null] - Optional key for the chat session. If not provided, a default is generated.
   * @param {string} [data=''] - Initial data for the chat session.
   * @returns {SmartChat} A new instance of SmartChat.
   */
  static create(env, key=null, data='') {
    if(!key) key = 'UNTITLED CHAT ' + get_file_date_string();
    const chat = new this(env, key, data);
    return chat;
  }

  /**
   * Computes the file path for the current chat session based on its key and file type.
   * 
   * @returns {string} The file path for the chat session.
   */
  get file_path() { return `${this.chats.folder}/${this.key}.${this.file_type}`; }

  /**
   * Returns the name (key) of the chat session.
   * 
   * @returns {string} The key of the chat session.
   */
  get name() { return this.key; }

  /**
   * Renames the current chat session and updates the storage references.
   * 
   * @param {string} new_id - The new identifier for the chat session.
   * @returns {Promise<void>}
   */
  async rename(new_id) {
    // console.log('renaming', this.key, new_id);
    if (this.key === new_id) return;
    if(await this.exists()) await this.delete();
    delete this.chats.items[this.key];
    this.key = new_id;
    this.chats.items[this.key] = this;
    await this.save();
  }

  /**
   * Retrieves all messages from the chat session and converts them to HTML format.
   * 
   * @returns {Promise<string>} A string containing all messages in HTML format.
   */
  async get_messages_html(){
    const messages = await this.get_messages();
    const html = await Promise.all(messages.map(async msg => {
      if(!msg.content) return '';
      if(msg.role === 'system') return await this.env.chat_ui.get_system_message_html(msg);
      return await this.env.chat_ui.get_message_html(msg.role, msg.content);
    }));
    return html.join('');
  }

  /**
   * Adds a new message to the chat session.
   * 
   * @param {Object} [msg={}] - The message object to add.
   * @returns {Promise<void>}
   */
  async add_message(msg={}){
    const chat_ml = await this.get_chat_ml();
    chat_ml.messages.push(msg);
    await this.update(chat_ml);
  }

  /**
   * Adds output from a tool to the chat session as a message.
   * 
   * @param {string} tool_name - The name of the tool.
   * @param {*} tool_output - The output from the tool.
   * @returns {Promise<void>}
   */
  async add_tool_output(tool_name, tool_output){
    if(typeof this.env.actions.parse_tool_output === 'function'){
      const message = await this.env.actions.parse_tool_output(tool_name, tool_output);
      if(message) return await this.add_message(message);
    }
    await this.add_message({role: 'tool', tool_call_id: tool_name, content: JSON.stringify(tool_output)});
  }

  // file-type specific parsing and formatting overrides
  /**
   * Updates the chat session data with the provided ChatML object and saves it.
   * 
   * @param {Object} chat_ml - The ChatML object to update the session with.
   * @returns {Promise<void>}
   */
  async update(chat_ml){
    this.data = this.from_chatml(chat_ml);
    await this.save();
  }

  /**
   * Saves the current chat session data to the file system.
   * 
   * @returns {Promise<void>}
   */
  async save() { return await this.chats.save(this.file_path, this.data); }

  /**
   * Deletes the chat session file from the file system.
   * 
   * @returns {Promise<void>}
   */
  async delete() { return await this.chats.delete(this.file_path); }

  /**
   * Checks if the chat session file exists in the file system.
   * 
   * @returns {Promise<boolean>} True if the file exists, false otherwise.
   */
  async exists() { return await this.chats.exists(this.file_path); }

  /**
   * Loads the chat session data from the file system.
   * 
   * @returns {Promise<string>} The loaded data.
   */
  async load() {
    if(!await this.exists()) return this.data = '';
    return this.data = await this.chats.read(this.file_path);
  }

  /**
   * Retrieves the ChatML object from the current session data.
   * 
   * @returns {Promise<Object>} The ChatML object.
   */
  async get_chat_ml() {
    await this.load();
    const chat_ml = this.to_chatml(this.data);
    return chat_ml;
  }

  /**
   * Retrieves all messages from the ChatML object of the current session.
   * 
   * @returns {Promise<Array>} An array of message objects.
   */
  async get_messages() { return (await this.get_chat_ml()).messages; }

  /**
   * Processes a new user message, updates UI/UX, and adds it to the chat session.
   * 
   * @param {string} content - The content of the user message.
   * @returns {Promise<void>}
   */
  async new_user_message(content){
    content = await this.parse_user_message(content);
    if(typeof this.env?.chat_ui?.new_user_message === 'function') await this.env.chat_ui.new_user_message(content); // UI/UX
    if(typeof this.env?.actions?.new_user_message === 'function') await this.env.actions.new_user_message(content); // context-retrieval (adds preceding system message if necessary)
    if(typeof this.chats?.new_user_message === 'function') await this.chats.new_user_message(content); // add additional logic here (chat-format-agnostic)
    await this.add_message({role: 'user', content});
    await this.env.chat_model.complete({});
  }

  // Override these for file-type specific parsing and formatting in subclasses
  /**
   * Returns the file type for the chat session, used in file operations.
   * 
   * @returns {string} The file type, default is 'json'.
   */
  get file_type() { return 'json'; }

  /**
   * Converts the provided data into a ChatML object. This method should be overridden in subclasses.
   * 
   * @param {string} data - The data to convert.
   * @returns {Object} The ChatML object.
   */
  to_chatml(data) { return data; }

  /**
   * Converts a ChatML object back into a string or suitable format for storage. This method should be overridden in subclasses.
   * 
   * @param {Object} data - The ChatML object to convert.
   * @returns {string} The string or formatted data.
   */
  from_chatml(data) { return data; }

  /**
   * Parses the user message content before adding it to the chat. This method can be overridden to include custom parsing logic.
   * 
   * @param {string} content - The content to parse.
   * @returns {Promise<string>} The parsed content.
   */
  async parse_user_message(content) { return content; }
}
function get_file_date_string() { return new Date().toISOString().replace(/(T|:|\..*)/g, " ").trim(); }
exports.SmartChat = SmartChat;
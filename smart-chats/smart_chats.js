// Copyright (c) Brian Joseph Petro

// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:

// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

const { SmartChat } = require("./smart_chat");
/**
 * Class representing a manager for smart chat conversations.
 * It handles the creation, loading, saving, and management of chat conversations in various formats.
 */
class SmartChats {
  /**
   * Creates an instance of SmartChats.
   * @param {Object} env - The environment context, used across the chat system.
   * @param {Object} [opts={}] - Optional parameters to configure the SmartChats instance.
   */
  constructor(env, opts={}) {
    this.env = env;
    this.items = {};
    this.default_file_type = 'md';
    this.chat_class = SmartChat;
    Object.assign(this, opts); // merge opts into this (adapter)
  }
  get folder() { return this.env.settings.smart_chats_folder || 'smart-chats'; }
  set folder(folder) { this.env.settings.smart_chats_folder = folder; }

  /**
   * Creates a new chat instance and initializes the chat UI.
   */
  async new() {
    if (this.current) {
      await this.current.save();
      this.current = null;
    }
    this.current = this.create_chat();
    console.log({current: this.current});
    await this.env.chat_ui.init();
  }
  create_chat(opts={}) {
    if(!opts.file_type) opts.file_type = this.default_file_type;
    return this.chat_class.create(this.env, opts);
  }

  /**
   * Loads all conversations from the filesystem and initializes them.
   */
  async load_all() {
    if(!await this.exists(this.folder)) await this.create_folder(this.folder);
    // load all conversations from file system
    const convos = await this.get_conversation_ids_and_file_types();
    // initiate each as smart_conversation instance
    convos.forEach(([conversation_id, file_type]) => {
      this.items[conversation_id] = this.create_chat({key: conversation_id, file_type});
    });
  }

  /**
   * Saves a chat conversation by its key.
   * If the chat does not exist, it creates a new one.
   * @param {string} key - The key identifier for the chat.
   * @param {string} chat_ml - The chat content in markup language.
   */
  async save(key, chat_ml) {
    let chat = this.items[key];
    if(!chat){
      console.log('Creating new conversation');
      chat = this.create_chat(key, chat_ml);
    }
    await chat.save(chat_ml);
  }


  /**
   * Retrieves conversation IDs and their corresponding file types from the filesystem.
   * @returns {Promise<Array<Array<string>>>} An array of conversation IDs and file types.
   */
  async get_conversation_ids_and_file_types(){
    console.log("get_conversation_ids_and_file_types");
    const folder = await this.list(this.folder);
    console.log(folder);
    const files = folder.files.map((file) => {
      const file_type = file.split(".").pop();
      const conversation_id = file.replace(this.folder + "/", "").replace("." + file_type, "");
      return [conversation_id, file_type];
    });
    return files; // return array of arrays: [[conversation_id, file_type], ...]
  }

  // Platform-specific methods to be overridden in subclasses or instances
  async open(conversation_id) {}
  async load(path) {  }
  async save(path, file_content) {  }
  async delete(path) {  }
  async exists(path) {  }
  async create_folder(path) {  }
  async list(path) {  }
}
exports.SmartChats = SmartChats;
exports.SmartChat = SmartChat;
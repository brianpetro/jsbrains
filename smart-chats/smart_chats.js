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

const { SmartChatMD } = require("./smart_chat_md");
const { SmartChat } = require("./smart_chat");
class SmartChats {
  constructor(env, opts={}) {
    this.env = env;
    this.folder = 'smart-chats';
    this.items = {};
    this.formats = {
      md: SmartChatMD,
      json: SmartChat,
    };
    this.default_file_type = 'md';
    // merge opts into this
    Object.assign(this, opts);
  }
  async new() {
    if (this.current) {
      await this.current.save();
      this.current = null;
    }
    this.current = this.file_format.create(this.env);
    console.log(this.current);
    await this.env.chat_ui.init();
  }
  async load_all() {
    if(!await this.exists(this.folder)) await this.create_folder(this.folder);
    // load all conversations from file system
    const convos = await this.get_conversation_ids_and_file_types();
    // initiate each as smart_conversation instance
    convos.forEach(([conversation_id, file_type]) => {
      if(!this.formats[file_type]) console.log('Unsupported file type', [conversation_id, file_type]);
      this.items[conversation_id] = this.formats[file_type].create(this.env, conversation_id);
    });
  }
  async save(key, chat_ml) {
    let chat = this.items[key];
    if(!chat){
      console.log('Creating new conversation');
      chat = this.file_format.create(this.env, key, chat_ml);
    }
    await chat.save(chat_ml);
  }
  get file_format() { return this.formats[this.default_file_type]; }
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
  // override with platform specific file system methods
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
exports.SmartChatMD = SmartChatMD;
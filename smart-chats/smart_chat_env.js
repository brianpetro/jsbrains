// main environment that loads smart chat
const { SmartChatModel } = require('smart-chat-model');
const { SmartChat } = require('./smart_chat');
const { SmartChats } = require('./smart_chats');
const { SmartChatUI } = require('./smart_chats_ui');

class SmartChatEnv {
  constructor() {
    this.chat_model = new SmartChatModel();
    this.chats = new SmartChats();
    this.chat = this.chats.new();
    this.chat_ui = new SmartChatUI();
  }
}
exports.SmartChatEnv = SmartChatEnv;
exports.SmartChatModel = SmartChatModel;
exports.SmartChat = SmartChat;
exports.SmartChats = SmartChats;
exports.SmartChatUI = SmartChatUI;
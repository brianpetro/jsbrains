import { ScChats as v21 } from "./sc_chats.js";
// const { ScChatMD } = require("./sc_chat_md22");
import { ScChat } from "./sc_chat22.js";

export class ScChats extends v21 {
  constructor(env, opts = {}) {
    super(env, opts);
    // this.formats.md = ScChatMD; // override default format
    this.default_file_type = "canvas";
    this.chat_class = ScChat;
  }
  open(key, index=null) {
    this.current = this.items[key];
    if(index) this.current.set_position(index);
    this.env.chat_ui.init();
  }
}
import { ScChatModel as v21 } from "./sc_chat_model.js";

export class ScChatModel extends v21 {
  async request_middlewares(opts){
    opts = await super.request_middlewares(opts);
    await Promise.all(opts.messages.map(async (msg, i) => {
      // match markdown embedded image syntax with named capture groups
      if(msg.role === "user" && Array.isArray(msg.content) && msg.content.some(part => part.type === "image_url")){
        // msg.content = msg.content.map(async part => {
        for(const part of msg.content){
          if(part.type === "image_url"){
            const tfile = this.env.smart_connections_plugin.app.vault.getFileByPath(part.image_url?.url);
            if(tfile){
              const base64 = this.env.smart_connections_plugin.obsidian.arrayBufferToBase64(await this.env.smart_connections_plugin.app.vault.readBinary(tfile));
              part.image_url.url = `data:image/${tfile.extension};base64,${base64}`;
            }
          }
        }
      }
    }));
    return opts;
  }
}

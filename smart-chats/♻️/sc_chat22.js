import { ScChat as v21 } from "./sc_chat.js";

export class ScChat extends v21 {
  async parse_user_message(content){
    // handle markdown images
    if(content.match(/!\[([^\]]*)]\((\S+)\)/g)){
      if(!this.env.chat_model.multimodal){
        console.warn("Current model does not support multimodal (image) content");
        throw new Error("⚠️ Current model does not support multimodal (image) content");
      }
      /**
       * Should be able to parse images like this:
       * ![](source/attachment/PXL_20220607_184000709.MP~2.jpg)
       * Transcribe:
       */
      const regex = /!\[(?<caption>[^\]]*)\]\((?<img_path>\S+)\)/g;
      let images = [];
      let match;
      while ((match = regex.exec(content)) !== null) {
        images.push({
          full_match: match[0],
          caption: match.groups.caption,
          img_path: match.groups.img_path
        });
      }
      for(const image of images){
        const og_content = typeof content === "string" ? content : (content[content.length - 1]?.text || "");
        if(typeof content === "string") content = [];
        const full_match = image.full_match;
        const img_path = image.img_path;
        const caption = image.caption;
        const text_before = og_content.split(full_match)[0].trim();
        const text_after = og_content.split(full_match)[1].trim();
        if(text_before) content.push({ type: "text", text: text_before });
        content.push({ type: "image_url", image_url: {url: img_path} });
        if(caption) content.push({ type: "text", text: `Image caption: ${caption}` });
        if(text_after) content.push({ type: "text", text: text_after });
      }
    }
    // call super to handle existing parsing
    content = await super.parse_user_message(content);
    return content;
  }
  set_position(index){ this.position = index; }
  async get_messages() {
    let messages = await super.get_messages();
    if(this.position){
      messages = messages.slice(0, this.position);
      this.position = null;
    }
    return messages;
  }
}


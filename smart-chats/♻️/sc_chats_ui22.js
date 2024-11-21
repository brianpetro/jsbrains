import { ScChatsUI as v21 } from "./sc_chats_ui.js";
import { FuzzySuggestModal } from "obsidian";
import { SmartChatOptions } from "./smart_chat_options.js";

export class ScChatsUI extends v21 {
  key_up_handler(e){
    if(e.key === "!"){
      const textarea = this.container.querySelector(".sc-chat-form textarea");
      const caret_pos = textarea.selectionStart;
      if (textarea.value.length === 1 || textarea.value[caret_pos - 2] === " ") {
        return this.open_image_select_modal();
      }
    }
    super.key_up_handler(e);
  }
  open_image_select_modal(){
    if (!this.image_selector) this.image_selector = new ScImageSelectModal(this.env.smart_connections_plugin.app, this.env);
    this.image_selector.open();
  }
  // override textarea placeholder
  add_chat_input_listeners() {
    super.add_chat_input_listeners();
    const chat_input = this.container.querySelector(".sc-chat-form");
    const textarea = chat_input.querySelector("textarea");
    textarea.placeholder = `Try "Based on my notes..." or "Summarize [[this note]]", "Important tasks in /folder/" or "Transcribe ![](image.png)"`;
  }
  add_listeners() {
    super.add_listeners();
    // chat options button
    const options_btn = this.container.querySelector("button[title='Chat Options']");
    options_btn.style.display = ""; // remove style display=none
    options_btn.addEventListener("click", () => {
      // if has contents, clear
      if(this.overlay_container.innerHTML) return this.overlay_container.innerHTML = "";
      if(!this.options_view) this.options_view = new SmartChatOptions(this.env, this.overlay_container);
      else this.options_view.container = this.overlay_container;
      this.options_view.render();
      this.on_open_overlay();
    });
  }
}

class ScImageSelectModal extends FuzzySuggestModal {
  constructor(app, env) {
    super(app);
    this.app = app;
    this.env = env;
    this.setPlaceholder("Type the name of an image...");
  }
  get image_extensions() { return [
    // "bmp",
    "gif",
    "heic",
    "heif",
    // "ico",
    "jpeg",
    "jpg",
    "png",
    // "svg",
    "webp",
  ]; }
  getItems() { return this.app.vault.getFiles().filter((file) => this.image_extensions.includes(file.extension)).sort((a, b) => a.basename.localeCompare(b.basename)); }
  getItemText(item) { return item.path; }
  onChooseItem(image) { this.env.chat_ui.insert_selection("["+image.basename + "](" + image.path + ") "); }
}

class ScChatContextModal extends FuzzySuggestModal {
  constructor(app, env, type=null) {
    super(app);
    this.app = app;
    this.env = env;
    this.setPlaceholder("Begin typing...");
    this.selection = [];
    this.types = [
      "notes", // .md
      "images", // .png, .jpg, .jpeg, .gif, .svg, .webp, .heic, .heif, .ico
      "folders",
      "system_prompts", // static
      // "templates", // structured output templates (vars parsed to tool_call)
      // "prompts", // system prompts, templates
      // "blocks",
      // "tasks",
      // "files",
    ];
    this.items = {};
    this.items.notes = this.app.vault.getFiles().filter((file) => file.extension === "md").sort((a, b) => a.basename.localeCompare(b.basename));
    this.items.images = this.app.vault.getFiles().filter((file) => this.image_extensions.includes(file.extension)).sort((a, b) => a.basename.localeCompare(b.basename));
    // this.items.folders = 
  }
  getItems() {
    const items = [];
    
  }
  getItemText(item) { return item.path; }
  onChooseItem(image) { this.env.chat_ui.insert_selection("["+image.basename + "](" + image.path + ")"); }
}
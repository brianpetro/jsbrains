import { SmartBlock } from "smart-sources";
import { render as message_template } from "./components/message";
import { contains_folder_reference, extract_folder_references } from "./utils/folder_references";
import { contains_internal_link, extract_internal_links } from "./utils/internal_links";
import { contains_self_referential_keywords } from "./utils/self_referential_keywords";
import { contains_system_prompt_ref, extract_system_prompt_ref } from "./utils/system_prompts";
import { render as context_template } from "./components/context";
import { render as tool_calls_template } from "./components/tool_calls";
import { contains_markdown_image, extract_markdown_images } from "./utils/markdown_images";
/**
 * @class SmartMessage
 * @extends SmartBlock
 * @description Represents a single message in a chat thread. Handles content parsing, context extraction,
 * and integration with various data sources including folders, internal links, and system prompts.
 * Supports both text and image content types.
 */
export class SmartMessage extends SmartBlock {
  /**
   * @static
   * @property {Object} defaults - Default configuration for a new message
   */
  static get defaults() {
    return {
      data: {
        thread_key: null,
        content: null,
        role: null,
        tool_calls: null,
        tool_call_id: null,
        image_url: null,
        msg_i: null,
        id: null,
        context: {},
        tool_call_output: null,
      }
    };
  }

  /**
   * Generates a unique key for the message
   * @returns {string} Unique message identifier
   */
  // get_key() { return `${this.data.thread_key}#${this.data.msg_i}`; }
  get_key() { return `${this.data.thread_key}#${this.data.id}`; }

  /**
   * Initializes the message and triggers processing if it's a user message
   * @async
   */
  async init() {
    while (!this.thread) await new Promise(resolve => setTimeout(resolve, 100)); // this shouldn't be necessary (why is it not working without this?)
    if(!this.data.msg_i) this.data.msg_i = this.thread.messages.length + 1;
    this.thread.data.messages[this.data.id] = this.data.msg_i;
    if(this.role === 'user') {
      this.parse_user_message();
      await this.render();
      // // FUTURE: may replace lookup-specific conditional with `Object.keys(this.context).length > 0` for reviewing additional extracted context
      // if(this.settings.review_context && this.context.lookup_results?.length > 0){
      //   // skip completion to await user submission in context review UI
      // }else{
      //   await this.thread.complete();
      // }
      await this.thread.complete();
    }else if(this.tool_calls?.length > 0){
      this.render_tool_calls();
      await this.handle_tool_calls();
    }else if(this.role === 'tool'){
      this.render_context();
      if(!this.settings.review_context){
        this.thread.complete();
      }
    }else{
      await this.render();
    }
    this.queue_save();
  }
  /**
   * Queues the message for saving via the thread.
   * @returns {void}
   */
  queue_save() {
    this._queue_save = true;
    this.thread?.queue_save();
  }

  /**
   * Renders the message in the UI
   * @async
   * @param {HTMLElement} [container] - Container element to render into
   * @returns {DocumentFragment} Rendered message interface
   */
  async render(container=this.thread.messages_container) {
    const frag = await message_template.call(this.smart_view, this);
    if(container) {
      this.elm = container.querySelector(`#${this.data.id}`);
      if (this.elm) this.elm.replaceWith(frag);
      else {
        container.appendChild(frag);
        await new Promise(resolve => setTimeout(resolve, 30));
      }
    }
    return frag;
  }
  async render_context(container=this.thread.messages_container) {
    const frag = await context_template.call(this.smart_view, this);
    const context_container = container.querySelector(`#context-container-${this.data.id}`);
    if (context_container) context_container.replaceWith(frag);
    else container.appendChild(frag);
  }
  async render_tool_calls(container=this.thread.messages_container) {
    const frag = await tool_calls_template.call(this.smart_view, this);
    const tool_calls_container = container.querySelector(`#tool-calls-container-${this.data.id}`);
    if (tool_calls_container) tool_calls_container.replaceWith(frag);
    else container.appendChild(frag);
  }

  /**
   * Parses a user message instance using OLD parsing utilities.
   * @param {Object} message_instance - The message instance to parse
   * @returns {Object} context - Parsed context object containing:
   * @returns {Array<string>} [context.system_prompt_refs] - Referenced system prompts
   * @returns {Array<Object>} [context.internal_links] - Extracted internal links
   * @returns {Array<string>} [context.folder_refs] - Referenced folders
   * @returns {boolean} [context.has_self_ref] - Whether message contains self-references
   * @returns {Array<string>} [context.hypotheticals] - Generated hypothetical notes
   * @returns {Array<Object>} [context.lookup_results] - Semantic search results
   */
  parse_user_message() {
    this.context = {};
    let content = this.data.content;
    
    // Return early if content is already parsed (not a string)
    if (typeof content !== "string") {
      return;
    }

    const language = this.env.settings?.language || 'en';

    // Handle system prompt references (@"system prompt") FIRST
    if (contains_system_prompt_ref(content)) {
      const { mentions, content: content_after_refs } = extract_system_prompt_ref(content);
      this.context.system_prompt_refs = mentions;
      content = content_after_refs; // remove system prompt references from content
    }

    // Handle internal links ([[link]])
    if (contains_internal_link(content)) {
      const internal_links = extract_internal_links(this.env, content);
      this.context.internal_links = internal_links;
    }

    // Handle folder references (/folder/ or /folder/subfolder/)
    if (contains_folder_reference(content)) {
      const folders = Object.keys(this.env.smart_sources.fs.folders);
      const folder_refs = extract_folder_references(folders, content);
      this.context.folder_refs = folder_refs;
    }

    // Handle self-referential keywords
    this.context.has_self_ref = contains_self_referential_keywords(content, language);
    
    // Handle markdown images LAST to preserve all processed text content
    if (contains_markdown_image(content)) {
      console.log('contains_markdown_image', content);
      if (!this.thread.chat_model.model_config.multimodal) {
        console.warn("Current model does not support multimodal (image) content");
        throw new Error("⚠️ Current model does not support multimodal (image) content");
      }

      const images = extract_markdown_images(content);
      if (images.length > 0) {
        this.context.images = images;
      }
    }

    // If we reach here, content is plain text
    this.data.content = content.trim();
  }
  
  // async retrieve_context(){
  //   if (this.context.has_self_ref || this.context.folder_refs) {
  //     this.context.hypotheticals = await this.get_hypotheticals();
  //     const lookup_params = this.build_lookup_params();
  //     const lookup_collection = this.env.smart_blocks.settings.embed_blocks ? this.env.smart_blocks : this.env.smart_sources;
  //     this.context.lookup_results = (await lookup_collection.lookup(lookup_params))
  //       .map(result => ({
  //         key: result.item.key,
  //         score: result.score,
  //       }))
  //     ;
  //   }
  //   await this.render_context();
  // }

  // build_lookup_params() {
  //   const lookup_params = { hypotheticals: this.context.hypotheticals };
  //   if (this.context.folder_refs) {
  //     lookup_params.filter = {
  //       key_starts_with_any: this.context.folder_refs
  //     };
  //   }
  //   return lookup_params;
  // }

  /**
   * Fetches and processes internal links, embedding images as Base64 data URLs.
   * @async
   * @param {Array<string>} paths - Array of paths to fetch content from
   * @returns {Array<Object>} contents - Array of content objects:
   * @returns {string} contents[].type - Content type ('text' or 'image')
   * @returns {string} [contents[].content] - Text content if type is 'text'
   * @returns {string} [contents[].image_url] - Base64 image URL if type is 'image'
   * @throws {Error} When unable to fetch or process content
   */
  async fetch_content(paths) {
    try {
      const image_extensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'heic', 'heif', 'ico'];
      const contents = await Promise.all(paths.map(async (path) => {
        if (path) {
          const item = this.env.smart_blocks.get(path) || this.env.smart_sources.get(path);
          // Check if the link is an image
          const file_extension = path.split('.').pop().toLowerCase();
          if (image_extensions.includes(file_extension)) {
            // DO (future): may return already extracted text if exists in item.data.content
            const image_data = await this.env.smart_sources.fs.read(path, 'base64');
            const base64_image = `data:image/${file_extension};base64,${image_data}`;
            return { type: 'image', image_url: base64_image };
          } else {
            // If not an image, return the text content
            return { type: 'text', content: await item.read() };
          }
        }
      }));
      return contents;
    } catch (error) {
      console.error(`Error fetching internal links content:`, error);
      return [];
    }
  }

  // /**
  //  * Generates hypothetical notes for semantic search context
  //  * @async
  //  * @param {string} content - User message content to generate hypotheticals from
  //  * @returns {Array<string>} hypotheticals - Array of generated hypothetical notes
  //  * @returns {string} hypotheticals[] - Each hypothetical in format: "FOLDER > FILE > HEADING: CONTENT"
  // */
  // async get_hypotheticals() {
  //   try {
  //     // Prepare the function call for HyDE Lookup
  //     const hyde_fx_call = {
  //       role: "user",
  //       content: this.content,
  //     };


  //     // Prepare the request payload
  //     const request = {
  //       messages: [
  //         {
  //           role: "system",
  //           content: `Anticipate what the user is seeking. Respond in the form of a hypothetical note written by the user. The note may contain statements as paragraphs, lists, or checklists in markdown format with no headings. Please respond with one hypothetical note and abstain from any other commentary. Use the format: PARENT FOLDER NAME > CHILD FOLDER NAME > FILE NAME > HEADING 1 > HEADING 2 > HEADING 3: HYPOTHETICAL NOTE CONTENTS.`
  //         },
  //         hyde_fx_call
  //       ],
  //       tools: [this.thread.tools['lookup']],
  //       tool_choice: { type: "function", function: { name: "lookup" } }
  //     };

  //     // **Invoke the Chat Model to Complete the Request**
  //     const response = await this.thread.chat_model.complete(request);

  //     console.log("HyDE Lookup Response:", response);

  //     return this.parse_hypotheticals(response);

  //   } catch (error) {
  //     console.error("HyDE Lookup Error:", error);
  //   }
  // }

  async handle_tool_calls(){
    for(const tool_call of this.tool_calls){
      if(tool_call.function.name === 'lookup'){
        await this.handle_lookup_tool_call(tool_call);
      }
    }
  }

  build_lookup_params(args){
    const params = JSON.parse(args);
    if(this.previous_message.context.folder_refs) params.filter = {
      key_starts_with_any: this.previous_message.context.folder_refs
    };
    params.filter = {
      ...(params.filter || {}),
      limit: this.settings.lookup_limit || 10,
    };
    return params;
  }
  async handle_lookup_tool_call(tool_call){
    const params = this.build_lookup_params(tool_call.function.arguments);
    const lookup_collection = this.env.smart_blocks.settings.embed_blocks ? this.env.smart_blocks : this.env.smart_sources;
    const lookup_results = (await lookup_collection.lookup(params))
      .map(result => ({
        key: result.item.key,
        score: result.score,
      }))
    ;
    await this.env.smart_messages.create_or_update({
      thread_key: this.thread.key,
      tool_call_id: tool_call.id,
      tool_name: tool_call.function.name,
      tool_call_output: lookup_results,
      role: 'tool',
    });
  }

  /**
   * Converts the message to a request payload
   * @returns {Array<Object>} Request payload
   */
  async to_request() {
    const messages = [];
    // let user_message.content = "";
    // let system_message.content = "";
    const this_message = { role: this.role, content: "" };
    const system_message = { role: "system", content: "" };

    /**
     * Build system message
     */
    // Combine all context into a single system message
    if (this.context.system_prompt_refs && this.context.system_prompt_refs.length > 0) {
      const system_prompts = await this.fetch_content(this.context.system_prompt_refs);
      if (system_prompts) {
        for (const system_prompt of system_prompts) {
          if (system_prompt.type === 'text') {
            system_message.content += `${system_prompt.content}\n\n`;
          }
        }
      }
    }
    if(this.context?.has_self_ref || this.context?.folder_refs){
      if(system_message.content) system_message.content += `\n`;
      system_message.content += `- Answer based on the context from lookup!`;
      system_message.content += `\n- The context may be referred to as notes.`;
    }

    /**
     * Build user message
     */
    if (this.context.internal_links && this.context.internal_links.length > 0) {
      const internal_links_content = await this.fetch_content(this.context.internal_links);
      if (internal_links_content) {
        this_message.content += `Context specified in message:\n`;
        this.context.internal_links.forEach((link, index) => {
          if (internal_links_content[index].type === 'text') {
            this_message.content += `-----------------------\n`;
            this_message.content += `/${link.path}\n`;
            this_message.content += `---\n`;
            this_message.content += `${internal_links_content[index].content}\n`;
            this_message.content += `-----------------------\n\n`;
          } else if (internal_links_content[index].type === 'image') {
            messages.push({
              role: 'user',
              image_url: internal_links_content[index].image_url,
            });
          }
        });
      }
    }

    // skip tool_call and tool_call_output when sending tool output in user message
    if(this.settings.send_tool_output_in_user_message){
      console.log('send_tool_output_in_user_message', this.settings.send_tool_output_in_user_message);
      if(this.is_last_message && this.role === 'tool'){
        return [];
      }
      if(this.tool_calls && !this.is_last_message){
        return [];
      }
      if(this.role === 'user' && this.next_message?.tool_calls?.length && !this.next_message.is_last_message && this.next_message.next_message.role === 'tool'){
        const tool_output = await this.next_message.next_message.tool_call_output_to_request();
        this_message.content += tool_output;
      }
    }

    if (this_message.content) {
      this_message.content += "\nMessage from user:\n";
    }
    this_message.content += this.data.content;
    
    // Handle multimodal content
    if (this.context.images?.length) {
      const content = [];
      // For multimodal messages, we need to process each content part
      const images = this.context.images
        // sort by occurrence in content (should be in order of appearance)
        .sort((a, b) => this.data.content.indexOf(a.full_match) - this.data.content.indexOf(b.full_match))
      ;
      for(const image of images){
        const file = this.env.smart_connections_plugin?.app.vault.getFileByPath(image.img_path);
        // Convert file path to base64 if needed
        if (file) {
          // split user_content at image.full_match
          const [text, remaining_text] = this_message.content.split(image.full_match);
          if(text.trim().length > 0){
            content.push({
              type: "text",
              text: text,
            });
          }
          this_message.content = remaining_text;
          const base64 = await this.env.smart_sources.fs.read(file.path, 'base64');
          content.push({
            type: "image_url",
            image_url: {
              url: `data:image/${file.extension};base64,${base64}`
            }
          });
        }
      }
      if(this_message.content.trim().length > 0){
        content.push({
          type: "text",
          text: this_message.content,
        });
      }
    }
    if (this.tool_calls?.length) this_message.tool_calls = this.tool_calls;
    if (this.tool_call_id) this_message.tool_call_id = this.tool_call_id;
    if (this.tool_call_output?.length) this_message.content = await this.tool_call_output_to_request();
    // Add system message if there's any content
    if (system_message.content) {
      messages.push(system_message);
    }
    messages.push(this_message);
    console.log('messages', messages);
    return messages;
  }

  async tool_call_output_to_request() {
    if(this.tool_name === 'lookup'){
      // // RETURNS LOOKUP OUTPUT AS JSON
      if(this.settings.tool_call_output_as_json){
        const lookup_collection = this.tool_call_output[0]?.key.includes('#') ? this.env.smart_blocks : this.env.smart_sources;
        const tool_call_output = await Promise.all(this.tool_call_output.map(async (result) => ({ ...result, content: (await lookup_collection.get(result.key).read()) })));
        return JSON.stringify(tool_call_output);
      }
  
      // RETURNS LOOKUP OUTPUT AS TEXT
      const lookup_content = await this.fetch_content(this.tool_call_output.map(result => result.key));
      let lookup_output = `Context from lookup:\n`;
      this.tool_call_output.forEach((result, index) => {
        if (lookup_content[index].type === 'text') {
          lookup_output += `-----------------------\n`;
          lookup_output += `/${result.key} (relevance score: ${result.score})\n`;
          lookup_output += `---\n`;
          lookup_output += `${lookup_content[index].content}\n`;
          lookup_output += `-----------------------\n\n`;
        } // should images be added here?
      });
      return lookup_output;
    }
  }

  // /**
  //  * Parses AI response to extract hypotheticals
  //  * @param {Object} response - AI response object
  //  * @returns {Array<string>} Extracted hypotheticals
  //  */
  // parse_hypotheticals(response) {
  //   return JSON.parse(response.choices[0].message.tool_calls[0].function.arguments || '{}').hypotheticals;
  // }

  /**
   * @property {string} content - Message content
   */
  get content() { return this.data.content; }
  set content(value) { this.data.content = value; }

  /**
   * @property {string} role - Message sender role ('user' or 'assistant')
   */
  get role() { return this.data.role; }
  set role(value) { this.data.role = value; }

  /**
   * @property {Object} tool_calls - Tool calls
   */
  get tool_calls() { return this.data.tool_calls; }
  set tool_calls(value) { this.data.tool_calls = value; }

  /**
   * @property {string} tool_call_id - Tool call ID
   */
  get tool_call_id() { return this.data.tool_call_id; }
  set tool_call_id(value) { this.data.tool_call_id = value; }

  /**
   * @property {Array<Object>} tool_call_output - Tool call output
   */
  get tool_call_output() { return this.data.tool_call_output; }
  set tool_call_output(value) { this.data.tool_call_output = value; }

  /**
   * @property {string} tool_name - Tool name
   */
  get tool_name() { return this.data.tool_name; }
  set tool_name(value) { this.data.tool_name = value; }

  /**
   * @property {Object} context - Message context data
   */
  get context() { return this.data.context; }
  set context(value) { this.data.context = value; }


  /**
   * @property {SmartThread} thread - Parent thread reference
   * @readonly
   */
  get thread() { return this.source; }

  /**
   * @property {number} msg_i - Message index (1-indexed)
   * @readonly
   */
  get msg_i() { return this.data.msg_i; }

  /**
   * @property {SmartMessage} next_message - Next message reference
   * @readonly
   */
  get next_message() { return this.thread.messages[this.msg_i]; }

  /**
   * @property {SmartMessage} previous_message - Previous message reference
   * @readonly
   */
  get previous_message() { return this.thread.messages[this.msg_i - 2]; }

  /**
   * @property {boolean} is_last_message - Whether the message is the last message in the thread
   * @readonly
   */
  get is_last_message() { return this.msg_i === Object.keys(this.thread.messages).length; }

  /**
   * @property {string} source_key - Key for source reference
   * @readonly
   */
  get source_key() { return this.data.thread_key; }

  /**
   * @property {SmartThreads} source_collection - Collection reference
   * @readonly
   */
  get source_collection() { return this.env.smart_threads; }

  /**
   * @property {string} path - Path identifier for the message
   * @readonly
   */
  get path() { return this.data.thread_key; }

  get settings() { return this.thread.settings; }
}

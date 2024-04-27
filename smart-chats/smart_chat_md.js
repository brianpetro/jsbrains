const { SmartChat } = require("./smart_chat");
const { chat_ml_to_markdown } = require("./src/chat_ml_to_markdown");
const { markdown_to_chat_ml } = require("./src/markdown_to_chat_ml");

/**
 * Extends SmartChat to handle markdown-specific functionalities.
 */
class SmartChatMD extends SmartChat {
  /**
   * Returns the file type associated with this class.
   * @returns {string} The file type, which is 'md' for markdown.
   */
  get file_type() { return 'md'; }

  /**
   * Updates the internal data with the provided ChatML and saves it.
   * @param {Object} chat_ml - The ChatML object to update the data with.
   */
  async update(chat_ml){
    this.data = this.from_chatml(chat_ml);
    await this.save();
  }

  // file-type specific parsing and formatting overrides
  /**
   * Retrieves the ChatML representation of the current data.
   * @returns {Promise<Object>} The ChatML object.
   */
  async get_chat_ml() {
    await this.load();
    const chat_ml = this.to_chatml(this.data);
    return chat_ml;
  }

  /**
   * Converts markdown text to a ChatML object.
   * @param {string} markdown - The markdown string to convert.
   * @returns {Object} The converted ChatML object.
   */
  to_chatml(markdown) { return markdown_to_chat_ml(markdown); }

  /**
   * Converts a ChatML object to markdown text.
   * @param {Object} chatml - The ChatML object to convert.
   * @returns {string} The converted markdown string.
   */
  from_chatml(chatml) { return chat_ml_to_markdown(chatml); }

  /**
   * Parses a user message to handle special syntax like mentions and converts them into system messages.
   * @param {string} content - The user message content.
   * @returns {Promise<string>} The processed content with mentions handled.
   */
  async parse_user_message(content) {
    // DO: decided: should this be moved to new_user_message()??? Partially as sc-context???
    if (content.includes("@\"")) {
      const mention_pattern = /@\"([^"]+)\"/;
      const mention = content.match(mention_pattern)[1];
      // get note with name mention and add to system message prior to user message
      const tfile = this.env.system_prompts.find(file => file.basename === mention);
      const note_content = await this.env.plugin.brain.cached_read(tfile);
      const system_msg = {
        role: "system",
        content: note_content,
      };
      // remove mention from user message
      content = content.replace(mention_pattern, "").trim();
      // add system message
      await this.add_message(system_msg);
    }
    return content;
  }
}

exports.SmartChatMD = SmartChatMD;
exports.chat_ml_to_markdown = chat_ml_to_markdown;
exports.markdown_to_chat_ml = markdown_to_chat_ml;
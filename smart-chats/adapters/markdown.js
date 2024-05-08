const { chat_ml_to_markdown } = require("../utils/chat_ml_to_markdown");
const { markdown_to_chat_ml } = require("../utils/markdown_to_chat_ml");

/**
 * Extends SmartChat to handle markdown-specific functionalities.
 */
class MarkdownAdapter {
  constructor(smart_chat) {
    this.smart_chat = smart_chat;
  }
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
    await this.smart_chat.save();
  }

  // file-type specific parsing and formatting overrides
  /**
   * Retrieves the ChatML representation of the current data.
   * @returns {Promise<Object>} The ChatML object.
   */
  async get_chat_ml() {
    await this.smart_chat.load();
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

}

exports.MarkdownAdapter = MarkdownAdapter;
exports.chat_ml_to_markdown = chat_ml_to_markdown;
exports.markdown_to_chat_ml = markdown_to_chat_ml;


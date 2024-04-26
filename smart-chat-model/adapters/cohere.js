/**
 * CohereAdapter class is designed to adapt the SmartChatModel's interaction with the Cohere API.
 * It provides methods to prepare request bodies, handle streaming data, and extract message content from responses.
 */
class CohereAdapter {
  /**
   * Converts a ChatML object to a format suitable for a request to the Cohere API.
   * @param {Object} chatml - The ChatML object containing the chat history and other parameters.
   * @returns {Object} The request body formatted for the Cohere API.
   */
  prepare_request_body(chatml) { return chatml_to_cohere(chatml); }

  /**
   * Extracts the message content from a JSON response from the Cohere API.
   * @param {Object} json - The JSON response object from which to extract the text content.
   * @returns {string} The extracted text content from the response.
   */
  get_message_content(json) { return json.text; }

  /**
   * Processes streaming data received from the Cohere API and extracts text chunks.
   * This method handles the accumulation of text data over multiple events and manages the state of the stream.
   * @param {Object} event - The event object containing streaming data.
   * @returns {string} The accumulated text chunk extracted from the stream.
   */
  get_text_chunk_from_stream(event) {
    if(!this.last_line_index) this.last_line_index = 0;
    clearTimeout(this.last_line_timeout);
    this.last_line_timeout = setTimeout(() => {
        this.last_line_index = 0;
    }, 10000);
    const data = event.source.xhr.responseText;
    // split by newline and get last
    const lines = data.split('\n').slice(this.last_line_index);
    console.log(lines);
    this.last_line_index += lines.length;
    const text_chunk = lines
        .filter((line) => line.trim() !== '')
        .map((line) => {
            console.log(line);
            const json = JSON.parse(line);
            if(json.event_type === 'stream-end') {
                console.log('stream-end');
                this.end_of_stream = true;
                setTimeout(() => {
                    this.end_of_stream = false;
                }, 3000);
                return '';
            }
            return json.text;
        })
        .join('');
    console.log(text_chunk);
    return text_chunk;
  }

  /**
   * Determines if the end of the stream has been reached based on the event data.
   * @param {Object} event - The event object that may indicate the end of the stream.
   * @returns {boolean} True if the end of the stream is indicated, false otherwise.
   */
  is_end_of_stream(event) { return this.end_of_stream; }
}
exports.CohereAdapter = CohereAdapter;

/**
 * Converts a ChatML object into a format suitable for the Cohere API.
 * This function prepares the data by structuring it according to the requirements of the Cohere API,
 * including the model to use, the chat history excluding the last user message, and the last message separately.
 * 
 * @param {Object} chatml - The ChatML object containing the model, messages, and other parameters like temperature.
 * @returns {Object} The formatted object for the Cohere API request, containing the model, chat history, last message, and temperature.
 */
function chatml_to_cohere(chatml) {
    const cohere = {
        model: chatml.model,
        // skip last user message
        chat_history: chatml.messages
            .slice(0, -1)
            .map((message) => ({
                role: message.role,
                message: parse_message_content_to_string(message),
            }))
        ,
        message: parse_message_content_to_string(chatml.messages[chatml.messages.length - 1]),
        temperature: chatml.temperature,
        // stream: chatml.stream // currently not supported
    };
    return cohere;
}
exports.chatml_to_cohere = chatml_to_cohere;

function parse_message_content_to_string(message) {
    return Array.isArray(message.content) ? message.content.filter(c => c.type === 'text').map(c => c.text).join('\n') : message.content;
}


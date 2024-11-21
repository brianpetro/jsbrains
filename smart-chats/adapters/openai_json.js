import { SmartChatDataAdapter } from "./_adapter.js";

/**
 * @class SmartThreadDataOpenaiJsonAdapter
 * @extends SmartChatDataAdapter
 * @description Adapter for handling OpenAI chat completion data format. Manages conversion between 
 * internal message format and OpenAI's ChatML format.
 */
export class SmartThreadDataOpenaiJsonAdapter extends SmartChatDataAdapter {
  /**
   * Parses an OpenAI chat completion response into internal message format
   * @param {Object} response - Raw response from OpenAI API
   * @returns {Object} Parsed response with messages array
   */
  parse_response(response) {
    const resp_key = Object.keys(this.data.responses).length;
    this.data.responses[resp_key] = response;
    return parse_openai_chat_completion(response);
  }

  /**
   * Converts internal message format to OpenAI chat completion request format
   * @async
   * @returns {Object} Request object with messages array formatted for OpenAI API
   */
  async to_request() {
    const request = { messages: [] };
    for(const msg of this.item.messages){
      if(msg.role === 'user') {
        request.messages.push(
          ...(await msg.get_message_with_context()) // returns array of messages
        );
        continue;
      }
      const _msg = {
        role: msg.role,
      };
      if (msg.data.content) _msg.content = msg.content;
      if (msg.data.tool_calls) _msg.tool_calls = msg.data.tool_calls;
      if (msg.data.tool_call_id) _msg.tool_call_id = msg.data.tool_call_id;
      if (msg.data.image_url) _msg.image_url = msg.data.image_url;
      request.messages.push(_msg);
    }
    return request;
  }
}

/**
 * Parses an OpenAI chat completion response into internal format
 * @private
 * @param {Object} response - Raw OpenAI chat completion response
 * @returns {Object} Parsed response with messages array
 */
function parse_openai_chat_completion(response) {
  const messages = [];
  if (response.choices) {
    response.choices.forEach((choice, choice_index) => {
      const message = {
        choice_index,
        ...parse_openai_message(choice.message),
      };
      messages.push(message);
    });
  }
  return { messages, id: response.id };
}

/**
 * Parses a single OpenAI message into internal format
 * @private
 * @param {Object} message - Single message from OpenAI response
 * @returns {Object} Parsed message data
 */
function parse_openai_message(message) {
  const message_data = {
    role: message.role,
  };
  if (message.content) message_data.content = message.content;
  if (message.function_call) message_data.function_call = message.function_call;
  if (message.tool_calls) message_data.tool_calls = message.tool_calls;
  return message_data;
}

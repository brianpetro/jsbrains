import { SmartChatDataAdapter } from "./_adapter.js";

/**
 * @class SmartThreadDataOpenaiJsonAdapter
 * @extends SmartChatDataAdapter
 * @description
 *  Stores SmartThread data in default collection data.
 */
export class SmartThreadDataOpenaiJsonAdapter extends SmartChatDataAdapter {
  parse_response(response) {
    const resp_key = Object.keys(this.data.responses).length;
    this.data.responses[resp_key] = response;
    return parse_openai_chat_completion(response);
  }

  to_request() {
    const request = {
      messages: this.item.messages.map(msg => {
        const _msg = {
          role: msg.role,
        };
        if (msg.data.content) _msg.content = msg.data.content;
        if (msg.data.tool_calls) _msg.tool_calls = msg.data.tool_calls;
        if (msg.data.tool_call_id) _msg.tool_call_id = msg.data.tool_call_id;
        if (msg.data.image_url) _msg.image_url = msg.data.image_url;
        return _msg;
      }),
    };
    return request;
  }
}

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
  return { messages };
}

function parse_openai_message(message) {
  const message_data = {
    role: message.role,
  };
  if (message.content) message_data.content = message.content;
  if (message.function_call) message_data.function_call = message.function_call;
  if (message.tool_calls) message_data.tool_calls = message.tool_calls;
  return message_data;
}

import { SmartChatDataAdapter } from "./_adapter.js";
/**
 * @class SmartThreadDataOpenaiJsonAdapter
 * @extends SmartChatDataAdapter
 * @description
 *  Stores SmartThread data in default collection data.
 */
export class SmartThreadDataOpenaiJsonAdapter extends SmartChatDataAdapter {
  parse_response(response) {
    const resp_key = this.data.turns.length;
    this.data.responses[resp_key] = response;
    const turn_index = this.data.turns.length;
    return parse_openai_chat_completion(response, turn_index);
  }
  to_request() {
    const request = {
      messages: this.item.messages.map(msg => {
        const _msg = {
          role: msg.role,
        };
        if(msg.data.content) _msg.content = msg.data.content;
        if(msg.data.tool_calls) _msg.tool_calls = msg.data.tool_calls;
        if(msg.data.tool_call_id) _msg.tool_call_id = msg.data.tool_call_id;
        if(msg.data.image_url) _msg.image_url = msg.data.image_url;
        return _msg;
      }),
    };
    return request;
  }
}

function parse_openai_chat_completion(response, turn_index) {
  const turns = [];
  const messages = [];
  if(response.choices) response.choices.forEach((choice, choice_index) => {
    const turn = {
      choice_index,
      turn_index,
      ...parse_openai_choice(choice),
    };
    const message = {
      choice_index,
      turn_index,
      ...parse_openai_message(choice.message),
    };
    turns.push(turn);
    messages.push(message);
  });
  return {turns, messages};
}
function parse_openai_choice(choice) {
  const turn_data = {};
  if(choice.role) turn_data.role = choice.message.role;
  return turn_data;
}

function parse_openai_message(message) {
  const message_data = {};
  if(message.content) message_data.content = message.content;
  if(message.function_call) message_data.function_call = message.function_call;
  return message_data;
}
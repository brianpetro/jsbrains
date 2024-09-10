// request = {
//   "type": "object",
//   "properties": {
//     "messages": {
//       "type": "array",
//       "items": {
//         "type": "object",
//         "properties": {
//           "role": {
//             "type": "string",
//             "enum": ["system", "user", "assistant", "function"]
//           },
//           "content": {
//             "type": ["string", "null"]
//           },
//           "name": {
//             "type": ["string", "null"],
//             "description": "Optional name for the message sender (e.g., function name or user name)."
//           },
//           "tool_calls": {
//             "type": "array",
//             "items": {
//               "type": "object",
//               "properties": {
//                 "tool_name": {
//                   "type": "string"
//                 },
//                 "parameters": {
//                   "type": "object",
//                   "description": "Parameters sent to the tool, structure depends on the tool."
//                 }
//               },
//               "required": ["tool_name", "parameters"]
//             },
//             "description": "Calls to external tools made by the assistant."
//           },
//           "image_url": {
//             "type": ["string", "null"],
//             "description": "URL of an image, if the message contains one."
//           }
//         },
//         "required": ["role"]
//       }
//     }
//   },
//   "required": ["messages"]
// }

// response = {
//   "type": "object",
//   "properties": {
//     "id": {
//       "type": "string",
//       "description": "Unique identifier for the chat session."
//     },
//     "object": {
//       "type": "string",
//       "enum": ["chat.completion"],
//       "description": "The type of object returned, e.g., 'chat.completion'."
//     },
//     "created": {
//       "type": "integer",
//       "description": "Timestamp when the response was created."
//     },
//     "choices": {
//       "type": "array",
//       "items": {
//         "type": "object",
//         "properties": {
//           "index": {
//             "type": "integer",
//             "description": "Index of the completion choice."
//           },
//           "message": {
//             "type": "object",
//             "properties": {
//               "role": {
//                 "type": "string",
//                 "enum": ["system", "user", "assistant", "function"]
//               },
//               "content": {
//                 "type": ["string", "null"],
//                 "description": "The main content of the message."
//               },
//               "name": {
//                 "type": ["string", "null"],
//                 "description": "Optional name of the function or user."
//               },
//               "tool_calls": {
//                 "type": "array",
//                 "items": {
//                   "type": "object",
//                   "properties": {
//                     "tool_name": {
//                       "type": "string"
//                     },
//                     "parameters": {
//                       "type": "object",
//                       "description": "Parameters sent to the tool."
//                     }
//                   },
//                   "required": ["tool_name", "parameters"]
//                 }
//               },
//               "image_url": {
//                 "type": ["string", "null"],
//                 "description": "URL of an image in the message."
//               }
//             },
//             "required": ["role"]
//           },
//           "finish_reason": {
//             "type": ["string", "null"],
//             "enum": ["stop", "length", "function_call", "null"],
//             "description": "The reason why the completion stopped."
//           }
//         },
//         "required": ["index", "message"]
//       }
//     },
//     "usage": {
//       "type": "object",
//       "properties": {
//         "prompt_tokens": {
//           "type": "integer",
//           "description": "Number of tokens used for the prompt."
//         },
//         "completion_tokens": {
//           "type": "integer",
//           "description": "Number of tokens used in the completion."
//         },
//         "total_tokens": {
//           "type": "integer",
//           "description": "Total number of tokens used."
//         }
//       }
//     }
//   },
//   "required": ["id", "object", "created", "choices", "usage"]
// }


import { SmartChatDataAdapter } from "./_adapter.js";
/**
 * @class SmartThreadDataJsonAdapter
 * @extends SmartChatDataAdapter
 * @description
 *  Stores SmartThread data in default collection data.
 */
export class SmartThreadDataJsonAdapter extends SmartChatDataAdapter {
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
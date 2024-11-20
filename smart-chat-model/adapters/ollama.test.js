import test from 'ava';
import { SmartChatModel } from '../smart_chat_model.js';
import { SmartChatModelOllamaAdapter, SmartChatModelOllamaResponseAdapter } from './ollama.js';

// Create an instance of SmartChatModel for Ollama
const smart_chat_model_ollama = new SmartChatModel({
  settings: {
    adapter: 'ollama',
    ollama: {
      base_url: 'http://localhost:11434',
      model_key: 'phi:latest',
    }
  },
  adapters: {
    ollama: SmartChatModelOllamaAdapter
  }
});

test('SmartChatModelOllamaResponseAdapter converts Ollama response to OpenAI schema', t => {
  const ollama_response = {
    model: 'phi:latest',
    created_at: '2024-11-20T22:40:42.149254Z',
    message: {
      role: 'assistant',
      content: ' Hello there! How can I assist you today?\n'
    },
    done_reason: 'stop',
    done: true,
    total_duration: 9190493500,
    load_duration: 8685658583,
    prompt_eval_count: 33,
    prompt_eval_duration: 200134000,
    eval_count: 12,
    eval_duration: 258990000
  };

  const response_adapter = new SmartChatModelOllamaResponseAdapter(smart_chat_model_ollama.adapter, ollama_response);
  const openai_response = response_adapter.to_openai();

  // Verify the converted response matches OpenAI schema
  t.truthy(openai_response.created);
  t.is(openai_response.object, 'chat.completion');
  
  // Verify choices array
  t.true(Array.isArray(openai_response.choices));
  t.is(openai_response.choices.length, 1);
  
  // Verify message content
  t.deepEqual(openai_response.choices[0].message, {
    role: 'assistant',
    content: ' Hello there! How can I assist you today?\n'
  });
  
  // Verify finish reason
  t.is(openai_response.choices[0].finish_reason, 'stop');

  // Verify usage metrics are included
  t.deepEqual(openai_response.usage, {
    prompt_tokens: 33,
    completion_tokens: 12,
    total_tokens: 45
  });
});

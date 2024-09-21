// init smart chat model instance
const model_1 = new SmartChatModel({
  platform_key: 'openai',
  model_key: 'gpt-4o',
  api_key: 'sk-proj-...',
});

// or

const settings = {
  platform_key: 'openai',
  'openai': {
    model_key: 'gpt-4o',
    api_key: 'sk-proj-...',
  }
};
const model_2 = new SmartChatModel({ settings });


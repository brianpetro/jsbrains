# Smart Chat Model

A universal chat model API client that supports a wide variety of providers and models. 

Supports using OpenAI formatted requests for any provider.

## Model Setup

Model options may be added directly to the model instance:
```javascript
// init smart chat model instance
const model = new SmartChatModel({
  platform_key: 'openai',
  model_key: 'gpt-4o',
  api_key: 'sk-proj-...',
});
```

or they may be included in the settings object:

```javascript
const settings = {
  platform_key: 'openai',
  'openai': {
    model_key: 'gpt-4o',
    api_key: 'sk-proj-...',
  }
};
// init smart chat model instance
const model = new SmartChatModel({ settings });
```

Model options added directly to the model instance will override options in the settings object.

The settings object may be a reference so that options can be changed after the model instance is created.
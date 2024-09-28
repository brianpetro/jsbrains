// curl --request GET \
//   --url https://api.cohere.ai/v1/models \
//   --header 'accept: application/json' \
//   --header "Authorization: bearer $CO_API_KEY"

async function fetch_cohere_models(api_key, request_adapter=null) {
  if (!api_key) {
    console.error('No API key provided');
    return [];
  }
  try {
    let data;
    if(!request_adapter) {
      const response = await fetch('https://api.cohere.ai/v1/models', {
        headers: {
          'Authorization': `Bearer ${api_key}`,
        },
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      data = await response.json();
    }else{
      const resp = await request_adapter({
        url: 'https://api.cohere.ai/v1/models',
        headers: {
          'Authorization': `Bearer ${api_key}`,
        },
      });
      data = await resp.json;
    }
    return data.models
      .filter(model => model.name.startsWith('command-'))
      .map(model => {
        const out = {
          model_name: model.name,
          key: model.name,
          max_input_tokens: model.context_length,
          tokenizer_url: model.tokenizer_url,
          finetuned: model.finetuned,
          description: `Max input tokens: ${model.context_length}, Finetuned: ${model.finetuned}`
        };
        return out;
      });
  } catch (error) {
    console.error('Failed to fetch model data:', error);
    return [];
  }
}
exports.fetch_cohere_models = fetch_cohere_models;


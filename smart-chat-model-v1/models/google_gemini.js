async function fetch_google_gemini_models(api_key, request_adapter=null) {
  if (!api_key) {
    console.error('No API key provided');
    return [];
  }
  try {
    let data;
    if(!request_adapter) {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + api_key);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      data = await response.json();
    }else{
      const resp = await request_adapter({
        url: 'https://generativelanguage.googleapis.com/v1beta/models?key=' + api_key,
      });
      data = await resp.json;
    }
    return data.models
      .filter(model => model.name.startsWith('models/gemini'))
      .map(model => {
        const out = {
          model_name: model.name.split('/').pop(), 
          key: model.name.split('/').pop(),
          max_input_tokens: model.inputTokenLimit,
          max_output_tokens: model.maxOutputTokens,
          description: model.description,
          multimodal: model.name.includes('vision') || model.description.includes('multimodal'),
          raw: model
        };
        return out;
      });
  } catch (error) {
    console.error('Failed to fetch model data:', error);
    return [];
  }
}
exports.fetch_google_gemini_models = fetch_google_gemini_models;
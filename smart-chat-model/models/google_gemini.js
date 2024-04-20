async function fetch_google_gemini_models(api_key) {
  if (!api_key) {
    console.error('No API key provided');
    return [];
  }
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + api_key);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    console.log('Model data retrieved:', data);
    return data.models
      .filter(model => model.name.startsWith('models/gemini'))
      .map(model => {
        const out = {
          model_name: model.name.split('/').pop(), 
          key: model.name.split('/').pop(),
          max_input_tokens: model.inputTokenLimit,
          max_output_tokens: model.maxOutputTokens,
          description: model.description
        };
        return out;
      });
  } catch (error) {
    console.error('Failed to fetch model data:', error);
    return [];
  }
}
exports.fetch_google_gemini_models = fetch_google_gemini_models;
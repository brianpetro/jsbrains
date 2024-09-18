async function fetch_open_router_models(api_key, request_adapter=null) {
  try {
    let data;
    if(!request_adapter) {
      const response = await fetch('https://openrouter.ai/api/v1/models');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      data = await response.json();
    }else{
      const resp = await request_adapter({
        url: 'https://openrouter.ai/api/v1/models',
      });
      data = await resp.json;
    }
    return data.data
      // .filter(model => !model.id.includes('instruct'))
      .map(model => ({
        model_name: model.id,
        key: model.id,
        max_input_tokens: model.context_length,
        description: model.name,
        actions: model.description.includes('tool use') || (model.description.includes('function call') && !model.description.includes('function calling depends')),
        multimodal: model.architecture.modality === 'multimodal',
        raw: model
      }))
    ;
  } catch (error) {
    console.error('Failed to fetch model data:', error);
    return [];
  }
}
exports.fetch_open_router_models = fetch_open_router_models;
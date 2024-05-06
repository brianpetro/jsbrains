async function fetch_open_router_models() {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models');
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    console.log('Model data retrieved:', data);
    return data.data
      // .filter(model => !model.id.includes('instruct'))
      .map(model => ({
        model_name: model.id,
        key: model.id,
        max_input_tokens: model.context_length,
        description: model.name,
        actions: model.description.includes('tool use') || model.description.includes('function call'),
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
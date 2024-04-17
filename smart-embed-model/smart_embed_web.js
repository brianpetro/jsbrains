window.addEventListener('message', init); // listen for init message
async function init(event) {
  if (event.data.type === 'init') {
    window.removeEventListener('message', init); // remove this event listener
    const model_config = event.data.model_config;
    console.log(model_config);
    const { TransformersIframeConnector } = await import('./transformers_iframe.js');
    const model = await TransformersIframeConnector.create(model_config, window);
    window.model = model;
  }
}
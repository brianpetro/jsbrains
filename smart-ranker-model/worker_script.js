const { SmartRankerModel } = require('./smart_ranker_model');
let model;

async function handle_incoming_data(data) {
  console.log('handle_incoming_data', data);
  try {
    switch (data.type) {
      case 'init':
        console.log('init', data.config);
        model = new SmartRankerModel({}, data.config);
        await model.init();
        return { status: 'ready' };
      case 'rank':
        return { type: 'ranked_documents', ranked_documents: await model.rank(data.query, data.documents) };
    }
  } catch (error) {
    console.error('Error in handle_incoming_data', error);
    return { status: 'error', error: error.message };
  }
}

if (typeof self !== 'undefined') {
  // Browser environment
  self.onmessage = async function(event) {
    const data = event.data;
    const result = await handle_incoming_data(data);
    self.postMessage(result);
  };
} else if (typeof require !== 'undefined') {
  // Node.js environment
  const { parentPort } = require('worker_threads');

  parentPort.on('message', async (data) => {
    const result = await handle_incoming_data(data);
    parentPort.postMessage(result);
  });
}

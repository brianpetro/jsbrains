const { Adapter } = require("./adapter");

class WorkerAdapter extends Adapter {
  async init() {
    if (!this.worker) {
      this.worker = create_worker();
      this.worker.postMessage({
        type: 'init',
        config: this.worker_config
      });

      await new Promise((resolve) => {
        if(typeof this.worker.on === 'function') {
          this.worker.on('message', (data) => {
            if (data.status === 'ready') {
              resolve();
            }
          });
        } else {
          this.worker.onmessage = (event) => {
            if (event.data.status === 'ready') {
              resolve();
            }
          };
        }
      });
    }
  }

  async rank(query, documents) {
    this.worker.postMessage({
      type: 'rank',
      query: query,
      documents: documents
    });

    const ranked_documents = await new Promise((resolve) => {
      if(typeof this.worker.on === 'function') {
        this.worker.on('message', (data) => {
          if (data.type === 'ranked_documents') {
            resolve(data.ranked_documents);
          }
        });
      } else {
        this.worker.onmessage = (event) => {
          if (event.data.type === 'ranked_documents') {
            resolve(event.data.ranked_documents);
          }
        };
      }
    });
    return ranked_documents;
  }
}

exports.WorkerAdapter = WorkerAdapter;

let Worker;
const is_node = typeof window === 'undefined';

if (is_node) {
  const { Worker: NodeWorker } = require('worker_threads');
  Worker = NodeWorker;
} else {
  Worker = window.Worker;
}

function create_worker() {
  if (is_node) {
    return create_node_worker('./worker_script.js');
  } else {
    const worker_script = `
class Adapter {
  /**
   * Constructs an instance of Adapter.
   * @param {object} main - The main context object which should contain a configuration object.
   */
  constructor(main) {
    /**
     * The main context object from which configuration is derived.
     * @type {object}
     */
    this.main = main;

    /**
     * Copies properties from the main object's config property to this instance.
     */
    Object.assign(this, main.config); // Copy config to this
  }
}
class TransformersAdapter extends Adapter {
    async init() {
      console.log('TransformersAdapter initializing');
      const { env, AutoTokenizer, AutoModelForSequenceClassification } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@latest');
      console.log('Transformers loaded');
      env.allowLocalModels = false;
      const model_id = this.model_key;
      if(this.quantized) {
        console.log('Quantized model loading');
      }
      this.tokenizer = await AutoTokenizer.from_pretrained(model_id);
      console.log('Tokenizer loaded');
      this.model = await AutoModelForSequenceClassification.from_pretrained(model_id, { quantized: this.quantized || false });
      console.log('Model loaded');
      console.log('TransformersAdapter initialized');
    }

    async rank(query, documents, options = {}) {
        const { top_k = undefined, return_documents = false } = options;
        const inputs = this.tokenizer(
            new Array(documents.length).fill(query),
            { text_pair: documents, padding: true, truncation: true }
        );
        const { logits } = await this.model(inputs);
        return logits.sigmoid().tolist()
            .map(([score], i) => ({
                corpus_id: i,
                score,
                ...(return_documents ? { text: documents[i] } : {})
            })).sort((a, b) => b.score - a.score).slice(0, top_k);
    }
}
class SmartRankerModel {
  constructor(env, config) {
    this.env = env;
    // if(config.model_key) this.config = {...models[config.model_key], ...config};
    // else this.config = { ...config };
    this.config = { ...config };
    console.log(this.config);
    this.adapter = new TransformersAdapter(this);
  }
  async rank(query, documents) {
    return this.adapter.rank(query, documents);
  }
  async init() {
    if(typeof this.adapter.init === 'function') await this.adapter.init();
  }
}

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
  // // service worker script
  // self.addEventListener("fetch", (event) => {
  //   event.respondWith(
  //     (async () => {
  //       let request, cache, response;
  //       request = event.request;
  //       cache = await caches.open("transformers-cache");
  //       response = await cache.match(request);
  //       if (response) return response;

  //       response = await fetch(request);
  //       if (response.status === 200 && !request.url.match(/onnx$|json$/)) {
  //         // cache files other than onnx and json (cached by transformers.js)
  //         cache.put(request, response.clone());
  //       }
  //       return response;
  //     })(),
  //   );
  // });
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
}`;
    return create_browser_worker(worker_script);
  }
}

function create_node_worker(worker_script) {
  try {
    const worker = new Worker(worker_script);

    worker.onerror = (error) => {
      console.error('Worker error:', error);
    };

    return worker;
  } catch (error) {
    console.error('Failed to create Node.js worker:', error);
    throw error;
  }
}

function create_browser_worker(worker_script_string) {
  try {
    const blob = new Blob([worker_script_string], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));

    worker.onerror = (error) => {
      console.error('Worker error:', error);
    };

    return worker;
  } catch (error) {
    console.error('Failed to create browser worker:', error);
    throw error;
  }
}

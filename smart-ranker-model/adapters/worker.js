const { Adapter } = require("./adapter");

class WorkerAdapter extends Adapter {
  async init() {
    if (!this.worker) {
      this.worker = create_worker('./worker_script.js');
      this.worker.postMessage({
        type: 'init',
        config: this.worker_config
      });

      await new Promise((resolve) => {
        this.worker.on('message', (data) => {
          if (data.status === 'ready') {
            resolve();
          }
        });
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
      this.worker.on('message', (data) => {
        if (data.type === 'ranked_documents') {
          resolve(data.ranked_documents);
        }
      });
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

function create_worker(worker_script) {
  if (is_node) {
    return create_node_worker(worker_script);
  } else {
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

function create_browser_worker(worker_script) {
  try {
    const worker = new Worker(worker_script);

    worker.onerror = (error) => {
      console.error('Worker error:', error);
    };

    return worker;
  } catch (error) {
    console.error('Failed to create browser worker:', error);
    throw error;
  }
}

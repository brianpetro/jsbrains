const { Adapter } = require("./adapter");
// load Worker from worker_threads if environment is node, otherwise load Worker from window
const { Worker } = (typeof window !== 'undefined') ? window : require('worker_threads');

class WorkerAdapter extends Adapter {
  // initiates a worker containing SmartRankerModel instance
  // rank function posts a message to the worker with the query and documents
  // and waits for the worker to return the ranked documents
  async init(){
    if(!this.worker){
      this.worker = new Worker("./worker_model.js");
      // send config to worker
      this.worker.postMessage({
        type: "config",
        config: this.main.config.worker_config
      });
      // wait for worker to be ready
      await new Promise((resolve) => {
        this.worker.on('message', (data) => {
          if(data.type === "ready"){
            resolve();
          }
        });
      });
    }
  }
  async rank(query, documents){
    // send query and documents to worker
    this.worker.postMessage({
      type: "rank",
      query: query,
      documents: documents
    });
    // wait for worker to return ranked documents
    const ranked_documents = await new Promise((resolve) => {
      this.worker.on('message', (data) => {
        if(data.type === "ranked_documents"){
          resolve(data.ranked_documents);
        }
      });
    });
    return ranked_documents;
  }
}

exports.WorkerAdapter = WorkerAdapter;
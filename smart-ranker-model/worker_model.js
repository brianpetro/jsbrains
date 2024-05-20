const { SmartRankerModel } = require('./smart_ranker_model');

// get config from message
let model;
onmessage = async (e) => {
  if (e.type === "config") {
    model = new SmartRankerModel({}, e.config);
    await model.init();
    postMessage({
      type: "ready"
    });
  }
  if (e.type === "rank") {
    const ranked_documents = await model.rank(e.query, e.documents);
    postMessage({
      type: "ranked_documents",
      ranked_documents: ranked_documents
    });
  }
};
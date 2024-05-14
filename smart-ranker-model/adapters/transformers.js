// EXAMPLE:
// import { AutoTokenizer, AutoModelForSequenceClassification } from '@xenova/transformers';

// const model_id = 'jinaai/jina-reranker-v1-tiny-en';
// const model = await AutoModelForSequenceClassification.from_pretrained(model_id, { quantized: false });
// const tokenizer = await AutoTokenizer.from_pretrained(model_id);

// /**
//  * Performs ranking with the CrossEncoder on the given query and documents. Returns a sorted list with the document indices and scores.
//  * @param {string} query A single query
//  * @param {string[]} documents A list of documents
//  * @param {Object} options Options for ranking
//  * @param {number} [options.top_k=undefined] Return the top-k documents. If undefined, all documents are returned.
//  * @param {number} [options.return_documents=false] If true, also returns the documents. If false, only returns the indices and scores.
//  */
// async function rank(query, documents, {
//     top_k = undefined,
//     return_documents = false,
// } = {}) {
//     const inputs = tokenizer(
//         new Array(documents.length).fill(query),
//         { text_pair: documents, padding: true, truncation: true }
//     )
//     const { logits } = await model(inputs);
//     return logits.sigmoid().tolist()
//         .map(([score], i) => ({
//             corpus_id: i,
//             score,
//             ...(return_documents ? { text: documents[i] } : {})
//         })).sort((a, b) => b.score - a.score).slice(0, top_k);
// }

// // Example usage:
// const query = "Organic skincare products for sensitive skin"
// const documents = [
//     "Eco-friendly kitchenware for modern homes",
//     "Biodegradable cleaning supplies for eco-conscious consumers",
//     "Organic cotton baby clothes for sensitive skin",
//     "Natural organic skincare range for sensitive skin",
//     "Tech gadgets for smart homes: 2024 edition",
//     "Sustainable gardening tools and compost solutions",
//     "Sensitive skin-friendly facial cleansers and toners",
//     "Organic food wraps and storage solutions",
//     "All-natural pet food for dogs with allergies",
//     "Yoga mats made from recycled materials",
// ]

// const results = await rank(query, documents, { return_documents: true, top_k: 3 });
// console.log(results);
const { Adapter } = require('./adapter');

class TransformersAdapter extends Adapter {
    async init() {
      console.log('TransformersAdapter initializing');
      const { env, AutoTokenizer, AutoModelForSequenceClassification } = await import('@xenova/transformers');
      console.log('Transformers loaded');
      env.allowLocalModels = true;
      const model_id = this.model_key || 'jinaai/jina-reranker-v1-tiny-en';
      this.model = await AutoModelForSequenceClassification.from_pretrained(model_id, { quantized: false });
      console.log('Model loaded');
      this.tokenizer = await AutoTokenizer.from_pretrained(model_id);
      console.log('Tokenizer loaded');
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

exports.TransformersAdapter = TransformersAdapter;
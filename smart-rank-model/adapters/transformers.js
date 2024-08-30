import { SmartRankAdapter } from "./_adapter.js";

export class SmartRankTransformersAdapter extends SmartRankAdapter {
  constructor(smart_rank) {
    super(smart_rank);
    this.model = null;
    this.tokenizer = null;
  }
  get use_gpu() { return this.smart_rank.opts.use_gpu || false; }

  async load() {
    console.log('TransformersAdapter initializing');
    const { env, AutoTokenizer, AutoModelForSequenceClassification } = await import('@xenova/transformers');
    console.log('Transformers loaded');
    env.allowLocalModels = true;
    const model_id = this.model_key;
    if (this.quantized) {
      console.log('Quantized model loading');
    }
    this.model = await AutoModelForSequenceClassification.from_pretrained(this.smart_rank.opts.model_key, { quantized: this.quantized || false });
    console.log('Model loaded');
    this.tokenizer = await AutoTokenizer.from_pretrained(this.smart_rank.opts.model_key);
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
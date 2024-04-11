const { SmartEmbed } = require("./SmartEmbed");

class SmartEmbedTransformersNodeAdapter extends SmartEmbed {
  // async init(this.model_name = 'Xenova/bge-small-en-v1.5') {
  async init() {
    const { env, pipeline, AutoTokenizer } = await import('@xenova/transformers');
    env.allowLocalModels = false;
    this.model = await pipeline('feature-extraction', this.model_name, { quantized: true, max_length: this.config.max_tokens });
    // this.model = await pipeline('feature-extraction', this.model_name, { quantized: false });
    this.tokenizer = await AutoTokenizer.from_pretrained(this.model_name);
  }
  async embed_batch(items) {
    items = items.filter(item => item.embed_input?.length > 0); // remove items with empty embed_input (causes .split() error)
    if(!items?.length) return [];
    const tokens = await Promise.all(items.map(item => this.count_tokens(item.embed_input)));
    const embed_input = await Promise.all(items.map(async (item, i) => {
      if (tokens[i] < this.config.max_tokens) return item.embed_input;
      let token_ct = tokens[i];
      let truncated_input = item.embed_input;
      while (token_ct > this.config.max_tokens) {
        const pct = this.config.max_tokens / token_ct; // get pct of input to keep
        const max_chars = Math.floor(truncated_input.length * pct * 0.90); // get number of characters to keep (minus 10% for safety)
        truncated_input = truncated_input.substring(0, max_chars) + "...";
        token_ct = await this.count_tokens(truncated_input);
      }
      // console.log("Input too long. Truncating to ", truncated_input.length, " characters.");
      // console.log("Tokens: ", tokens[i], " -> ", token_ct);
      tokens[i] = token_ct;
      return truncated_input;
    }));

    // console.log(embed_input);
    try{
      const resp = await this.model(embed_input, { pooling: 'mean', normalize: true });
      // console.log(resp);
      return items.map((item, i) => {
        item.vec = Array.from(resp[i].data);
        item.tokens = tokens[i];
        return item;
      });
    }catch(err){
      console.log(err);
      console.log("Error embedding batch. Trying one at a time...");
    }
    const resp = await Promise.all(items.map(async item => {
      const { vec, tokens, error } = await this.embed(item.embed_input);
      if(error){
        console.log("Error embedding item: ", item.key);
        console.log(error);
        item.error = error;
        return item;
      }
      if(!vec){
        console.log("Error embedding item: ", item.key);
        console.log("Vec: ", vec);
        console.log("Error: ", error);
        console.log("Tokens: ", tokens);
        console.log("No vec returned");
        item.error = "No vec returned";
        return item;
      }
      item.vec = vec.map(val => Math.round(val * 100000000) / 100000000); // reduce precision to 8 decimal places ref: https://wfhbrian.com/vector-dimension-precision-effect-on-cosine-similarity/
      item.tokens = tokens;
      return item;
    }));
    return resp;
  }
  async embed(input) {
    const output = { embed_input: input };
    if (!input) return { ...output, error: "No input text." };
    if (!this.model) await this.init();
    try {
      output.tokens = await this.count_tokens(input);
      if (output.tokens < 1) return { ...output, error: "Input too short." };
      if (output.tokens < this.config.max_tokens) {
        const embedding = await this.model(input, { pooling: 'mean', normalize: true });
        output.vec = Array.from(embedding.data).map(val => Math.round(val * 100000000) / 100000000); // reduce precision to 8 decimal places ref: https://wfhbrian.com/vector-dimension-precision-effect-on-cosine-similarity/
      } else {
        const pct = this.config.max_tokens / output.tokens; // get pct of input to keep
        const max_chars = Math.floor(input.length * pct * 0.95); // get number of characters to keep (minus 5% for safety)
        input = input.substring(0, max_chars) + "...";
        output.truncated = true;
        console.log("Input too long. Truncating to ", input.length, " characters.");
        const { vec, tokens } = await this.embed(input);
        output.vec = vec;
        output.tokens = tokens;
      }
      return output;
    } catch (err) {
      console.log(err);
      return { ...output, error: err.message };
    }
  }
  async count_tokens(text) {
    if (!this.tokenizer) await this.init();
    const { input_ids } = await this.tokenizer(text);
    return input_ids.data.length; // Return the number of tokens
  }
}

exports.SmartEmbedTransformersNodeAdapter = SmartEmbedTransformersNodeAdapter;
exports.SmartEmbedLocalAdapter = SmartEmbedTransformersNodeAdapter; // alias
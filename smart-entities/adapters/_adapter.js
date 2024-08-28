export class EntityAdapter {
  constructor(smart_entity) {
    this.smart_entity = smart_entity;
  }
  get data() { return this.smart_entity.data; }
  get embed_model_key() { return this.smart_entity.embed_model_key; }

  get vec() {
    return this.data?.embeddings?.[this.embed_model_key]?.vec;
  }

  set vec(vec) {
    if (!this.data.embeddings) {
      this.data.embeddings = {};
    }
    if (!this.data.embeddings[this.embed_model_key]) {
      this.data.embeddings[this.embed_model_key] = {};
    }
    this.data.embeddings[this.embed_model_key].vec = vec;
  }
}
export class EntityAdapter {
  constructor(smart_entity) {
    this.smart_entity = smart_entity;
  }
  get data() { return this.smart_entity.data; }
  get embed_model() { return this.smart_entity.embed_model; }

  get vec() {
    return this.data?.embeddings?.[this.embed_model]?.vec;
  }

  set vec(vec) {
    if (!this.data.embeddings) {
      this.data.embeddings = {};
    }
    if (!this.data.embeddings[this.embed_model]) {
      this.data.embeddings[this.embed_model] = {};
    }
    this.data.embeddings[this.embed_model].vec = vec;
  }
}
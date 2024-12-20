import { DefaultEntitiesVectorAdapter, DefaultEntityVectorAdapter } from "smart-entities/adapters/default.js";
import { sort_by_score_ascending, sort_by_score_descending } from "smart-entities/utils/sort_by_score.js";

export class MedianMemberVectorsAdapter extends DefaultEntitiesVectorAdapter {
}

export class MedianMemberVectorAdapter extends DefaultEntityVectorAdapter {
  get members() {
    return this.item.members;
  }
  get member_collection() {
    return this.item.member_collection;
  }
  async nearest_members(filter = {}) {
    filter.key_starts_with = this.item.data.path;
    const results = await this.member_collection.nearest(this.median_vec, filter);
    return results.sort(sort_by_score_descending);
  }
  async furthest_members(filter = {}) {
    filter.key_starts_with = this.item.data.path;
    const results = await this.member_collection.furthest(this.median_vec, filter);
    return results.sort(sort_by_score_ascending);
  }
  get median_vec() {
    if (!this._median_vec) {
      this._median_vec = this.calculate_median_vec();
    }
    return this._median_vec;
  }
  calculate_median_vec() {
    const member_vecs = this.members
      .map(member => member.vec)
      .filter(vec => vec);

    if (!member_vecs.length) return null;
    const vec_length = member_vecs[0].length;
    const median_vec = new Array(vec_length);
    const mid = Math.floor(member_vecs.length / 2);
    for (let i = 0; i < vec_length; i++) {
      const values = member_vecs.map(vec => vec[i]).sort((a, b) => a - b);
      median_vec[i] = member_vecs.length % 2 !== 0
        ? values[mid]
        : (values[mid - 1] + values[mid]) / 2;
    }
    return median_vec;
  }
  get median_block_vec() {
    if (!this._median_block_vec) {
      if(!this.item.members[0].blocks.length){
        throw new Error("No blocks found for median block vector calculation");
      }
      this._median_block_vec = this.calculate_median_block_vec();
    }
    return this._median_block_vec;
  }
  calculate_median_block_vec() {
    const block_vecs = this.members
      .flatMap(member => member.blocks)
      .map(block => block.vec)
      .filter(vec => vec);

    if (!block_vecs.length) return null;

    const vec_length = block_vecs[0].length;
    const median_vec = new Array(vec_length);
    const mid = Math.floor(block_vecs.length / 2);
    for (let i = 0; i < vec_length; i++) {
      const values = block_vecs.map(vec => vec[i]).sort((a, b) => a - b);
      median_vec[i] = block_vecs.length % 2 !== 0
        ? values[mid]
        : (values[mid - 1] + values[mid]) / 2;
    }
    return median_vec;
  }
}
export default {
  collection: MedianMemberVectorsAdapter,
  item: MedianMemberVectorAdapter
}
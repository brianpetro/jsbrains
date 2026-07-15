import { create_hash, murmur_hash_32_alphanumeric } from "smart-utils/create_hash.js";

export class SourceContentAdapter {
  constructor(item) {
    this.item = item;
  }
  async import() { this.throw_not_implemented('import'); }
  async create() { this.throw_not_implemented('create'); }
  async update() { this.throw_not_implemented('update'); }
  async read() { this.throw_not_implemented('read'); }
  async remove() { this.throw_not_implemented('remove'); }
  // HELPER METHODS
  get data() { return this.item.data; }
  // async create_hash(content) { return await create_hash(content); }
  create_hash(content) { return murmur_hash_32_alphanumeric(content); }

  /**
   * Resolve persisted source outlinks, optionally limited to a source line range.
   *
   * @param {number[]|null} [lines=null]
   * @returns {Array<import('smart-types').LinkObject>}
   */
  get_outlinks(lines = null) {
    let outlinks = Array.isArray(this.data.outlinks)
      ? this.data.outlinks
      : Object.values(this.data.outlinks || {})
    ;

    if (Array.isArray(lines) && lines.length === 2) {
      const [line_start, line_end] = lines;
      outlinks = outlinks.filter(link => {
        return (
          typeof link?.line === 'number'
          && link.line >= line_start
          && link.line <= line_end
        );
      });
    }

    return outlinks
      .map(link => {
        const link_data = link && typeof link === 'object' ? link : { target: link };
        const link_target = link_data.target;
        const link_ref = link_target?.includes?.('#')
          ? link_target.split('#')[0]
          : link_target
        ;
        if (typeof link_ref !== 'string') return null;
        if (link_ref.startsWith('http')) return null;
        const link_path = this.fs.get_link_target_path(link_ref, this.item.file_path);
        return {
          ...link_data,
          key: link_path || link_ref,
          embedded: link_data.embedded || false,
          source_key: this.item.key,
        };
      })
      .filter(Boolean)
    ;
  }
  get settings(){
    return this.item.env.settings.smart_sources[this.adapter_key];
  }
  get adapter_key(){
    return to_snake(this.constructor.name);
  }
  static get adapter_key(){
    return to_snake(this.name);
  }
  get fs() {
    return this.item.collection.fs;
  }
  get env() {
    return this.item.env;
  }


}

function to_snake(str){
  return str[0].toLowerCase() + str.slice(1).replace(/([A-Z])/g, '_$1').toLowerCase();
}

export default {
  item: SourceContentAdapter
};
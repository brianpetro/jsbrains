// HASHING
// const crypto = require('crypto');
// function md5(string) { return crypto.createHash('md5').update(String(string)).digest('hex'); }
// exports.md5 = md5;
// create uid from embed_input_arr without using md5/crypto
function create_uid(data) {
  const str = JSON.stringify(data);
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
    // remove negative sign
    if (hash < 0) hash = hash * -1;
  }
  return hash.toString() + str.length;
}
exports.create_uid = create_uid;
// DEEP MERGE
function deep_merge(target, source) {
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      // both exist and are objects
      if (is_obj(source[key]) && is_obj(target[key])) deep_merge(target[key], source[key]);
      else target[key] = source[key]; // precedence to source
    }
  }
  return target;
  function is_obj(item) { return (item && typeof item === 'object' && !Array.isArray(item)); }
}
exports.deep_merge = deep_merge;
// NAMESPACES
function collection_instance_name_from(class_name) {
  return class_name
    .replace(/([a-z])([A-Z])/g, '$1_$2') // convert camelCase to snake_case
    .toLowerCase() // convert to lowercase
    .replace(/y$/, 'ie') // ex. summaries
    + 's';
}
exports.collection_instance_name_from = collection_instance_name_from;
// COSINE SIMILARITY
function cos_sim(vector1, vector2) {
  const dotProduct = vector1.reduce((acc, val, i) => acc + val * vector2[i], 0);
  const normA = Math.sqrt(vector1.reduce((acc, val) => acc + val * val, 0));
  const normB = Math.sqrt(vector2.reduce((acc, val) => acc + val * val, 0));
  return normA === 0 || normB === 0 ? 0 : dotProduct / (normA * normB);
}
exports.cos_sim = cos_sim;
function top_acc(_acc, item, ct = 10) {
  if (_acc.items.size < ct) {
    _acc.items.add(item);
  } else if (item.sim > _acc.min) {
    _acc.items.add(item);
    _acc.items.delete(_acc.minItem);
    _acc.minItem = Array.from(_acc.items).reduce((min, curr) => (curr.sim < min.sim ? curr : min));
    _acc.min = _acc.minItem.sim;
  }
}
exports.top_acc = top_acc;

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
exports.sleep = sleep;
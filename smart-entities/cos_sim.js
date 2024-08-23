// // COSINE SIMILARITY
// export function cos_sim(vector1, vector2) {
//   const dotProduct = vector1.reduce((acc, val, i) => acc + val * vector2[i], 0);
//   const normA = Math.sqrt(vector1.reduce((acc, val) => acc + val * val, 0));
//   const normB = Math.sqrt(vector2.reduce((acc, val) => acc + val * val, 0));
//   return normA === 0 || normB === 0 ? 0 : dotProduct / (normA * normB);
// }
// COSINE SIMILARITY
export function cos_sim(vector1, vector2) {
  if (vector1.length !== vector2.length) {
    throw new Error('Vectors must have the same length');
  }

  let dot_product = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;
  const epsilon = 1e-8;  // Small value to avoid division by zero

  for (let i = 0; i < vector1.length; i++) {
    dot_product += vector1[i] * vector2[i];
    magnitude1 += vector1[i] * vector1[i];
    magnitude2 += vector2[i] * vector2[i];
  }

  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);

  if (magnitude1 < epsilon || magnitude2 < epsilon) {
    return 0;
  }

  return dot_product / (magnitude1 * magnitude2);
}
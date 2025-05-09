/**
 * Computes the centroid of an array of points in N-dimensional space.
 * The centroid is the arithmetic mean of the coordinates across all points.
 * @param {number[][]} points - Array of points, each is an array of numbers
 * @returns {number[]|null} - The centroid as an array, or null if no points
 */
export function compute_centroid(points) {
  if (!points || points.length === 0) {
    return null
  }
  const n = points.length
  const dim = points[0].length
  // Use a typed array to accumulate sums more efficiently for large dimensions
  const sums = new Float64Array(dim)

  for (let i = 0; i < n; i++) {
    const p = points[i]
    for (let d = 0; d < dim; d++) {
      sums[d] += p[d]
    }
  }

  for (let d = 0; d < dim; d++) {
    sums[d] /= n
  }
  // Convert typed array back to a normal array
  return Array.from(sums)
}

/**
 * Computes the medoid of an array of points in N-dimensional space.
 * The medoid is the point from the input set that has the minimum
 * sum of distances to all other points.
 * @param {number[][]} points - Array of points, each is an array of numbers
 * @returns {number[]|null} - The medoid point as an array, or null if no points
 */
export function compute_medoid(points) {
  if (!points || points.length === 0) {
    return null
  }
  if (points.length === 1) {
    return points[0]
  }

  const n = points.length
  const dim = points[0].length
  // Track sum of distances for each point, using typed array
  const sum_of_distances = new Float64Array(n)

  // We only compute each pairwise distance once
  for (let i = 0; i < n - 1; i++) {
    const p_i = points[i]
    for (let j = i + 1; j < n; j++) {
      const p_j = points[j]
      let dist_sq = 0
      for (let d = 0; d < dim; d++) {
        const diff = p_i[d] - p_j[d]
        dist_sq += diff * diff
      }
      const dist = Math.sqrt(dist_sq)
      sum_of_distances[i] += dist
      sum_of_distances[j] += dist
    }
  }

  // Find the point with minimum sum_of_distances
  let min_index = 0
  let min_sum = sum_of_distances[0]
  for (let i = 1; i < n; i++) {
    if (sum_of_distances[i] < min_sum) {
      min_sum = sum_of_distances[i]
      min_index = i
    }
  }
  return points[min_index]
}

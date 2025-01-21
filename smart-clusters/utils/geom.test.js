import test from 'ava'
import { compute_centroid, compute_medoid } from './geom.js'

/**
 * Basic integration tests for geom.js
 */

test('compute_centroid returns null for empty array', t => {
  const result = compute_centroid([])
  t.is(result, null)
})

test('compute_centroid returns correct centroid for 2D points', t => {
  const points = [[0, 0], [2, 2], [4, 6]]
  const result = compute_centroid(points)
  t.deepEqual(result, [2, 8/3]) // [2, 2.666...]
})

test('compute_centroid returns correct centroid for 3D points', t => {
  const points = [[1, 2, 3], [3, 2, 1], [2, 2, 2]]
  const result = compute_centroid(points)
  t.deepEqual(result, [2, 2, 2])
})

test('compute_medoid returns null for empty array', t => {
  const result = compute_medoid([])
  t.is(result, null)
})

test('compute_medoid returns the single point if only one point', t => {
  const single = [[10, 20, 30]]
  const result = compute_medoid(single)
  t.deepEqual(result, [10, 20, 30])
})

test('compute_medoid finds a correct medoid among 2D points', t => {
  // Distances:
  // - P0=(0,0): sum of dists = d(0,0->2,2)+d(0,0->4,6)=2√2 + √(4²+6²)=2.828...+7.211...≈10.039
  // - P1=(2,2): sum of dists = d(2,2->0,0)+d(2,2->4,6)=2.828...+√(2²+4²)=2.828...+4.4721...≈7.300
  // - P2=(4,6): sum of dists = d(4,6->0,0)+d(4,6->2,2)=7.211...+4.4721...≈11.683
  // So P1 should be medoid
  const points = [[0,0],[2,2],[4,6]]
  const result = compute_medoid(points)
  t.deepEqual(result, [2,2])
})

test('compute_medoid finds a correct medoid among 3D points', t => {
  // Points roughly around (2,2,2) but P1 is closer to the group center.
  const points = [
    [1, 2, 3],
    [2, 2, 2], // this one is the best guess for medoid
    [3, 2, 1]
  ]
  const result = compute_medoid(points)
  t.deepEqual(result, [2, 2, 2])
})

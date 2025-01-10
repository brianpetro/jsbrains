// file: test/cluster_sources.test.js
import test from 'ava';
import { cluster_sources } from '../utils/cluster_sources.js';

/**
 * Helper to create a fake source with a known vector
 * @param {string} key
 * @param {number[]} vec
 * @returns {object} Fake "source" with .key and .vec
 */
function make_fake_source(key, vec) {
  return { key, vec };
}

/**
 * Minimally check the shape of a cluster result:
 *    { key, center_source_key, members, number_of_members }
 */
function validate_cluster_structure(t, clusterObj) {
  t.truthy(clusterObj.key);
  t.true(Array.isArray(clusterObj.members), 'members is an array');
  t.is(clusterObj.number_of_members, clusterObj.members.length);
  t.assert(
    typeof clusterObj.center_source_key === 'string' || clusterObj.center_source_key === null,
    'center_source_key is string or null'
  );
}

/**
 * Scenario B: Single cluster (clusters_ct=1), two items with identical vectors
 */
test('cluster_sources(): single cluster, two identical vectors => 1 stable cluster', (t) => {
  const sources = [
    make_fake_source('s1', [1, 0, 0]),
    make_fake_source('s2', [1, 0, 0]),
  ];

  const result = cluster_sources(sources, {
    clusters_ct: 1,
    max_iterations: 5,
  });

  t.true(Array.isArray(result));
  t.is(result.length, 1, 'One cluster returned');

  const mainCluster = result[0];
  validate_cluster_structure(t, mainCluster);
  // Both items should be in the single cluster
  t.is(mainCluster.members.length, 2, 'Both sources in the single cluster');

  // The center_source_key should be one of the two
  t.true(
    mainCluster.center_source_key === 's1' || mainCluster.center_source_key === 's2',
    'Center is either s1 or s2'
  );
});

/**
 * Scenario C: 3 distinct vectors => each item in its own cluster (assuming cluster_ct=3).
 * In practice k-medoids could cluster them differently, but often each will end up alone.
 */
test('cluster_sources(): 3 distinct vectors => expect 3 clusters', (t) => {
  const sources = [
    make_fake_source('sA', [1, 0]),
    make_fake_source('sB', [0, 1]),
    make_fake_source('sC', [0.7, 0.7]),
  ];

  const result = cluster_sources(sources, {
    clusters_ct: 3,
    max_iterations: 5,
  });

  t.true(Array.isArray(result));
  t.is(result.length, 3, 'Should return 3 clusters');

  // Validate cluster shape
  result.forEach((c) => {
    validate_cluster_structure(t, c);
  });
});

/**
 * Scenario D: 2 similar + 1 outlier => 2 in one cluster, outlier in another
 */
test('cluster_sources(): 2 similar + 1 outlier => 2 in one cluster, 1 in the other', (t) => {
  const sources = [
    make_fake_source('s1', [1.0, 1.0]),
    make_fake_source('s2', [0.99, 1.01]), // very close
    make_fake_source('s3', [-0.001, -0.001]), // outlier
  ];

  const result = cluster_sources(sources, {
    clusters_ct: 2,
    max_iterations: 10,
  });

  t.true(Array.isArray(result));
  t.is(result.length, 2, 'Expect exactly 2 clusters');

  // One cluster should contain s1 and s2
  const clusterWithS1andS2 = result.find(
    (c) => c.members.includes('s1') && c.members.includes('s2')
  );
  t.truthy(clusterWithS1andS2, 'Found cluster with s1 and s2');
  validate_cluster_structure(t, clusterWithS1andS2);

  // The outlier s3 should be in the other cluster
  const clusterWithS3 = result.find((c) => c.members.includes('s3'));
  t.truthy(clusterWithS3, 'Found cluster with outlier s3');
  validate_cluster_structure(t, clusterWithS3);
});

test('cluster_sources(): basic test - no config => auto k selection', (t) => {
  // Generate 30 items with random 5D embeddings
  const items = Array.from({ length: 30 }).map((_, i) => ({
    key: `source_${i}`,
    vec: random_vector(5),
  }));

  const clusters = cluster_sources(items);

  // We expect a non-empty array of clusters
  t.true(Array.isArray(clusters));
  t.true(clusters.length > 0);

  // Check each cluster shape
  for (const c of clusters) {
    t.truthy(c.key);
    t.truthy(c.center_source_key);
    t.true(Array.isArray(c.members));
    t.true(typeof c.number_of_members === 'number');
    t.is(c.members.length, c.number_of_members);
  }
});

test('cluster_sources(): fixed clusters_ct', (t) => {
  const items = Array.from({ length: 25 }).map((_, i) => ({
    key: `item_${i}`,
    vec: random_vector(3), // 3D
  }));

  // Force exactly 4 clusters
  const config = { clusters_ct: 4 };
  const clusters = cluster_sources(items, config);

  // We asked for exactly 4 clusters
  t.is(clusters.length, 4);
  let totalAssigned = 0;
  for (const c of clusters) {
    totalAssigned += c.number_of_members;
  }
  // All items must be assigned
  t.is(totalAssigned, items.length);
});

test('cluster_sources(): edge case - empty items => returns empty array', (t) => {
  const items = [];
  const clusters = cluster_sources(items);

  t.deepEqual(clusters, []);
});

test('cluster_sources(): edge case - k > n scenario => handle leftover clusters gracefully', (t) => {
  // 3 items, but config asks for 5 clusters
  const items = [
    { key: 'x', vec: [1, 2] },
    { key: 'y', vec: [2, 3] },
    { key: 'z', vec: [3, 4] },
  ];
  const config = { clusters_ct: 5 };
  const clusters = cluster_sources(items, config);

  // Implementation might return exactly 5 clusters (with 2 empty) or just 3 used.
  t.true(clusters.length >= 3 && clusters.length <= 5);
  const totalAssigned = clusters.reduce(
    (sum, cl) => sum + cl.number_of_members,
    0
  );
  t.is(totalAssigned, 3);
});

/**
 * Generate a random vector of length d
 * @param {number} d
 * @returns {number[]}
 */
function random_vector(d) {
  return Array.from({ length: d }, () => Math.random());
}

test('cluster_sources(): respects custom distance function', (t) => {
  const sources = [
    { key: 'p1', vec: [-10, -10] },
    { key: 'p2', vec: [100, 100] },
    { key: 'p3', vec: [101, 101] },
  ];

  // Custom distance: Euclidean
  function euclidean_distance(a, b) {
    const sumSq = a.reduce((acc, val, i) => acc + (val - b[i]) ** 2, 0);
    return Math.sqrt(sumSq);
  }

  // Force 2 clusters
  const clusters = cluster_sources(sources, {
    clusters_ct: 2,
    distance_fn: euclidean_distance,
    max_iterations: 10,
  });

  t.true(Array.isArray(clusters));
  t.is(clusters.length, 2);

  // Because of Euclidean distance, p1 is far from p2/p3,
  // so you might expect p2/p3 in one cluster and p1 alone in another
  const clusterWithP2 = clusters.find((c) => c.members.includes('p2'));
  const clusterWithP3 = clusters.find((c) => c.members.includes('p3'));
  t.is(clusterWithP2, clusterWithP3, 'p2 and p3 should be in the same cluster');

  const clusterWithP1 = clusters.find((c) => c.members.includes('p1'));
  t.truthy(clusterWithP1, 'p1 is alone in the other cluster');
});

test('cluster_sources(): single item => exactly one cluster with that item', (t) => {
  const sources = [
    { key: 'single_item', vec: [42, 42] },
  ];

  const clusters = cluster_sources(sources);
  t.true(Array.isArray(clusters));
  t.is(clusters.length, 1, 'Should have one cluster');
  t.deepEqual(clusters[0].members, ['single_item']);
  t.is(clusters[0].center_source_key, 'single_item');
});
test('cluster_sources(): all items identical => single cluster if K=1 or K-based if forced', (t) => {
  const sources = Array.from({ length: 5 }).map((_, i) => ({
    key: `id_${i}`,
    vec: [1, 1, 1],
  }));

  // Let the algorithm pick K automatically
  // (It might settle on 2..some small number, but typically 2 or 1.)
  const clustersAuto = cluster_sources(sources);
  t.true(clustersAuto.length >= 1, 'Should have at least 1 cluster');
  const totalMembersAuto = clustersAuto.reduce((acc, c) => acc + c.number_of_members, 0);
  t.is(totalMembersAuto, 5, 'All 5 items must be assigned somewhere');

  // Force K=3 just to see behavior
  const clustersK3 = cluster_sources(sources, { clusters_ct: 3 });
  t.is(clustersK3.length, 3, 'Exactly 3 clusters expected');
  const totalMembersK3 = clustersK3.reduce((acc, c) => acc + c.number_of_members, 0);
  t.is(totalMembersK3, 5, 'All items assigned across 3 clusters');
});

test('cluster_sources(): auto_optimize_k => picks best K via silhouette', (t) => {
  const sources = [
    { key: 'a', vec: [0, 0] },
    { key: 'b', vec: [0, 0.1] },
    { key: 'c', vec: [0, 10] },
    { key: 'd', vec: [0, 9.9] },
  ];

  // We expect it might choose K=2 for these 4 items:
  //   cluster1 ~ {a,b}, cluster2 ~ {c,d}
  // (exact outcome depends on distances & silhouette)
  const clusters = cluster_sources(sources, {
    auto_optimize_k: true,
  });

  t.true(Array.isArray(clusters));
  t.true(clusters.length > 0, 'Non-empty clusters array');

  // Verify all items assigned
  const totalAssigned = clusters.reduce((acc, c) => acc + c.number_of_members, 0);
  t.is(totalAssigned, sources.length);
});

// Warning: may be slow in certain CI environments
// Use .serial or skip if performance is an issue
test.skip('cluster_sources(): large dataset stress test (performance)', (t) => {
  const itemCount = 10000;
  const items = Array.from({ length: itemCount }, (_, i) => ({
    key: `it_${i}`,
    vec: random_vector(10), // 10D
  }));

  const config = {
    clusters_ct: 10,
    max_iterations: 50,
  };

  const startTime = Date.now();
  const clusters = cluster_sources(items, config);
  const durationMs = Date.now() - startTime;

  t.true(Array.isArray(clusters), 'Should produce an array of clusters');
  t.log(`Clustering took ${durationMs} ms for ${itemCount} items`);
});


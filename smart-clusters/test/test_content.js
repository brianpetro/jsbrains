#!/usr/bin/env node

/**
 * @file create_test_content.js
 * @description 
 * Node script to create a handful of Markdown files in `smart-clusters/test/test-content/` for integration testing.
 * Each file includes comments in this script describing its purpose in cluster-related tests.
 *
 * Usage:
 *  1. `cd` into the root of your project (one level up from `smart-clusters/`).
 *  2. Run: `node smart-clusters/test/create_test_content.js`
 *
 * This script will:
 *  - Ensure the `smart-clusters/test/test-content/` directory exists.
 *  - Write multiple markdown files with test content.
 *  - Each file is intended to produce different similarity/dissimilarity outcomes.
 */

import fs from 'fs';
import path from 'path';

// Directory in which we create these test .md files
const baseDir = path.join(process.cwd(), 'test/test-content');

// Ensure the directory exists
if (!fs.existsSync(baseDir)) {
  fs.mkdirSync(baseDir, { recursive: true });
}

// Files to create:
// 1. sample_1.md
//    Purpose: A short, simple markdown file with minimal text. Should embed as a small vector.
//    Expectation: Clusters that rely on minimal content might group it with other short minimal files.
//
// 2. similar_a.md
//    Purpose: Contains text similar to similar_b.md. We expect these two files to appear in the same cluster.
//    Expectation: High cosine similarity between this and similar_b.md.
//
// 3. similar_b.md
//    Purpose: Contains text similar to similar_a.md. Also expected to cluster together with similar_a.md.
//    Expectation: High cosine similarity with similar_a.md.
//
// 4. unique_a.md
//    Purpose: Has content that differs significantly from other files, to observe how it may form a singleton cluster.
//    Expectation: Low similarity to other items, possibly ends up alone.
//
// 5. random_1.md
//    Purpose: Demonstrates random text that doesn't match others strongly.
//    Expectation: Possibly forms a cluster with random_2 if content overlaps, or sits alone.
//
// 6. random_2.md
//    Purpose: Another random text file to test random or partial similarity to random_1.md.
//    Expectation: Might cluster with random_1 if there's enough textual overlap, or remain somewhat separate.
//
// Additional files can be added here as needed.

const filesData = [
  {
    name: 'sample_1.md',
    content: `# Sample 1

This is a very short source file used for testing Smart Clusters.

It doesn't share content with other test files, but is short enough that any embedding might be minimal.

- Key testing aspect: minimal content, checks how clustering deals with near-empty or low-token items.
`
  },
  {
    name: 'similar_a.md',
    content: `# Similar A

Hello world. This text is used to check similarity with Similar B.

It contains phrases like "cluster analysis", "cosine similarity", and "embedding vectors".
We hope that the repeated references to embedding topics will align it with Similar B's content.

- Key testing aspect: high textual overlap with "similar_b.md".
`
  },
  {
    name: 'similar_b.md',
    content: `# Similar B

Hello world. This text is used to check similarity with Similar A.

It also mentions "embedding vectors", "cluster analysis", and "cosine similarity".
In principle, it should appear in the same cluster as Similar A due to repeated keywords.

- Key testing aspect: high textual overlap with "similar_a.md".
`
  },
  {
    name: 'unique_a.md',
    content: `# Unique A

Quantum entanglement defies local realism and has profound implications for the foundation of quantum mechanics.

It doesn't reference any typical "embedding" or "cosine" verbiage. So it should remain quite distinct.

- Key testing aspect: drastically different content than the rest.
`
  },
  {
    name: 'random_1.md',
    content: `# Random 1

Jlore ipwxa kdla zptfy ucbls oflo mfrow. Dqnjnx clfri zpil xioqd.
Random text with no direct connection to the other test files.

- Key testing aspect: mostly nonsense; if random_2 shares partial nonsense, they might cluster.
`
  },
  {
    name: 'random_2.md',
    content: `# Random 2

Udmxa jzpsw okalm dxnwy gfrty zptfy srandom xioqd zgy shq.
Some partial overlap with random_1, but still mostly gibberish.

- Key testing aspect: possibly a partial textual overlap with random_1.
`
  }
];

// Write each file to the test-content folder
filesData.forEach(fileObj => {
  const filePath = path.join(baseDir, fileObj.name);
  fs.writeFileSync(filePath, fileObj.content, 'utf8');
  console.log(`Created: ${fileObj.name}`);
});

console.log(`\nTest markdown files have been created in: ${baseDir}\n`);
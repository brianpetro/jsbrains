#!/usr/bin/env node

/**
 * @file test_content.js
 * @description
 * Creates some dummy text/markdown files in `smart-entities/test/test-content/`
 * for integration tests of SmartEntities with embeddings.  
 *
 * Usage:
 *   1) cd into `smart-entities/test/`
 *   2) run: `node test_content.js`
 *   3) The script will create `test-content/` subfolder with a few .md files.
 *
 * Then, in your test code (e.g., transformers.test.js), you can point the environment
 * to `smart-entities/test/test-content/` to run embedding or entity operations.
 */

import fs from 'fs';
import path from 'path';

// The directory where we'll create test files
const baseDir = path.join(process.cwd(), 'test/test-content');

// Ensure the directory exists
if (!fs.existsSync(baseDir)) {
  fs.mkdirSync(baseDir, { recursive: true });
}

const filesData = [
  {
    name: 'entity_example_1.md',
    content: `# Entity Example 1

This is a short example file used to test SmartEntities with an embedding model.
It doesn't have too much content, but enough to produce a vector.

- Key topics: embedding, short text.
`
  },
  {
    name: 'entity_example_2.md',
    content: `# Entity Example 2

Another sample file with somewhat different text.
We'll see if the embeddings place it near or far from Example 1.

- Key topics: similarity, embedding, semantic distance.
`
  },
  {
    name: 'entity_irrelevant.md',
    content: `# Entity Irrelevant

Completely unrelated content focusing on quantum entanglement and local hidden variables.
We expect this to embed quite differently from the 'embedding' or 'similarity' topics in the other examples.

- Key topics: quantum, entanglement, hidden variables.
`
  },
  {
    name: 'entity_random.md',
    content: `# Entity Random

Jibberish lines:
Rondolp hifer qwt opsidu. Alkpfe yoyz klmb?

This should test random text handling in the embedding space.

- Key topics: random, nonsense text.
`
  }
];

// Write each file
filesData.forEach((fileObj) => {
  const filePath = path.join(baseDir, fileObj.name);
  fs.writeFileSync(filePath, fileObj.content, 'utf8');
  console.log(`Created: ${fileObj.name}`);
});

console.log(`\nTest content has been created in: ${baseDir}\n`);

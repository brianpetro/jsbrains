/**
 * @file test_content.js
 * Creates test directories and markdown files for integration tests of SmartDirectories.
 */

import fs from "fs";
import path from "path";

const baseDir = path.join(process.cwd(), "test", "test-directories-content");
if (!fs.existsSync(baseDir)) {
  fs.mkdirSync(baseDir, { recursive: true });
}

// Create a nested directory structure
const dirs = [
  'project/',
  'project/docs/',
  'project/docs/guides/',
  'notes/',
  'notes/2024/',
  'notes/archive/',
];

dirs.forEach(d => {
  const fullPath = path.join(baseDir, d);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Create some markdown files in these directories
const files = {
  'project/README.md': '# Project Readme\nSome basic info.',
  'project/docs/guide.md': '# Guide\nDetailed instructions.',
  'project/docs/guides/advanced.md': '# Advanced Guide\nMore details.',
  'notes/2024/january.md': '# January Notes\n- Task 1\n- Task 2',
  'notes/2024/february.md': '# February Notes\n- Task A\n- Task B',
  'notes/archive/old.md': '# Old Notes\nThis is outdated content.',
};

Object.entries(files).forEach(([relPath, content]) => {
  const fullPath = path.join(baseDir, relPath);
  fs.writeFileSync(fullPath, content, 'utf8');
});

console.log("Test directories and markdown files created at:", baseDir);
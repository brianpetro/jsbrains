import test from 'ava';
import { build_file_tree_string } from './file_tree.js';

test('should creates expected ASCII tree', t => {
  const paths = ['docs/a.md', 'docs/b/c.md', 'misc/x.md'];
  const tree  = build_file_tree_string(paths);
  const expected = [
    '├── docs/',
    '│   ├── b/',
    '│   │   └── c.md',
    '│   └── a.md',
    '└── misc/',
    '    └── x.md'
  ].join('\n');
  t.is(tree, expected, 'Tree structure should match expected output');
});

test('should handle folder-only paths by including trailing slash on leaf folders', t => {
  const paths = ['docs/', 'misc/', 'docs/sub/'];
  const tree  = build_file_tree_string(paths);
  const expected = [
    '├── docs/',
    '│   └── sub/',
    '└── misc/',
  ].join('\n');
  t.is(tree, expected, 'Tree structure should match expected output');
});
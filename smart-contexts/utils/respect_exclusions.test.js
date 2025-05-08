import test from 'ava';
import { respect_exclusions, strip_excluded_headings } from './respect_exclusions.js';

test('Given excluded_headings, respect_exclusions should remove those sections from items', async t => {
  const opts = {
    excluded_headings: ['Secret', '*Private*'],
  };
  const snapshot = {
    items: [{
      'fileA.md': {content: `# Secret\nexcluded A\n# Keep\nremain A`},
      'fileB.md': {content: `## Private Stuff\nexcluded B\n## AlsoKeep\nremain B`},
    }]
  };

  await respect_exclusions(snapshot, opts);

  // fileA: heading "Secret" content is removed
  t.false(snapshot.items[0]['fileA.md'].content.includes('excluded A'), 'secret heading removed');
  t.true(snapshot.items[0]['fileA.md'].content.includes('remain A'), 'non-excluded content remains');
  t.is(snapshot.exclusions['Secret'], 1, 'Secret heading was excluded');

  // fileB: heading "Private Stuff" content is removed
  t.false(snapshot.items[0]['fileB.md'].content.includes('excluded B'), 'private heading removed');
  t.true(snapshot.items[0]['fileB.md'].content.includes('remain B'), 'non-excluded content remains');
  t.is(snapshot.exclusions['*Private*'], 1, 'Private Stuff heading was excluded');
});

test('No excluded headings => no changes', async t => {
  const originalContent = `# Normal\nKeep me\n## Also normal\nKeep me too`;
  const opts = {
    excluded_headings: [],
  };
  const snapshot = {
    items: [{
      'fileX.md': {content: originalContent}
    }]
  };

  await respect_exclusions(snapshot, opts);
  t.is(snapshot.items[0]['fileX.md'].content, originalContent, 'No changes when excluded_headings is empty');
  t.deepEqual(snapshot.exclusions, undefined, 'No exclusions when excluded_headings is empty');
});

test('Should also strip headings from link content if links exist', async t => {
  const opts = {
    excluded_headings: ['Hidden'],
  };
  const snapshot = {
    items: [{
      'normal.md': {content: '# Hidden\nexcluded\n# Visible\nretained'}
    },
    {
      'linkedKey.md': {from: ['source.md'], content: '# Hidden\nexcluded link content\n# Show\nkept link content', type: ['OUTLINK'], depth: [1]},
    }
  ],
  };

  await respect_exclusions(snapshot, opts);

  const finalItem = snapshot.items[0]['normal.md'];
  t.false(finalItem.content.includes('excluded'), 'Excluded heading in normal item removed');
  t.true(finalItem.content.includes('retained'), 'Non-excluded remains in normal item');
  const link_obj = snapshot.items[1]['linkedKey.md'];
  t.is(link_obj.from[0], 'source.md', 'Link key unchanged');
  t.false(link_obj.content.includes('excluded link content'), 'Excluded heading in link content removed');
  t.true(link_obj.content.includes('kept link content'), 'Non-excluded link content remains');
  t.is(snapshot.exclusions['Hidden'], 2, 'Hidden heading was excluded twice');
});


test('strip_excluded_headings removes every occurrence of duplicate excluded headings', t => {
  const md = `
# Secret
hidden1
# Keep
visible
## Secret
hidden2
  `;
  const [out, exclusions, removed] = strip_excluded_headings(md, ['Secret']);

  t.false(out.includes('hidden1'));
  t.false(out.includes('hidden2'));
  t.true(out.includes('visible'));
  t.is(exclusions.length, 2);           // both Secret sections reported
  t.true(exclusions.every(e => e === 'Secret'));
  t.true(removed > 0);
});

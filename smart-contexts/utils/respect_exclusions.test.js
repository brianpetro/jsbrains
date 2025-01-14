import test from 'ava';
import { respect_exclusions } from './respect_exclusions.js';

test('Given excluded_headings, respect_exclusions should remove those sections from items', async t => {
  const opts = {
    excluded_headings: ['Secret', '*Private*'],
    items: {
      'fileA.md': `# Secret\nexcluded A\n# Keep\nremain A`,
      'fileB.md': `## Private Stuff\nexcluded B\n## AlsoKeep\nremain B`,
    }
  };

  await respect_exclusions(opts);

  // fileA: heading "Secret" content is removed
  t.false(opts.items['fileA.md'].includes('excluded A'), 'secret heading removed');
  t.true(opts.items['fileA.md'].includes('remain A'), 'non-excluded content remains');
  t.is(opts.exclusions['Secret'], 1, 'Secret heading was excluded');

  // fileB: heading "Private Stuff" content is removed
  t.false(opts.items['fileB.md'].includes('excluded B'), 'private heading removed');
  t.true(opts.items['fileB.md'].includes('remain B'), 'non-excluded content remains');
  t.is(opts.exclusions['*Private*'], 1, 'Private Stuff heading was excluded');
});

test('No excluded headings => no changes', async t => {
  const originalContent = `# Normal\nKeep me\n## Also normal\nKeep me too`;
  const opts = {
    excluded_headings: [],
    items: {
      'fileX.md': originalContent
    }
  };

  await respect_exclusions(opts);
  t.is(opts.items['fileX.md'], originalContent, 'No changes when excluded_headings is empty');
  t.deepEqual(opts.exclusions, undefined, 'No exclusions when excluded_headings is empty');
});

test('Should also strip headings from link content if links exist', async t => {
  const opts = {
    excluded_headings: ['Hidden'],
    items: {
      'normal.md': '# Hidden\nexcluded\n# Visible\nretained'
    },
    links: {
      'linkedKey.md': {from: ['source.md'], content: '# Hidden\nexcluded link content\n# Show\nkept link content', type: ['OUTLINK'], depth: [1]},
    }
  };

  await respect_exclusions(opts);

  const finalItem = opts.items['normal.md'];
  t.false(finalItem.includes('excluded'), 'Excluded heading in normal item removed');
  t.true(finalItem.includes('retained'), 'Non-excluded remains in normal item');
  const link_obj = opts.links['linkedKey.md'];
  t.is(link_obj.from[0], 'source.md', 'Link key unchanged');
  t.false(link_obj.content.includes('excluded link content'), 'Excluded heading in link content removed');
  t.true(link_obj.content.includes('kept link content'), 'Non-excluded link content remains');
  t.is(opts.exclusions['Hidden'], 2, 'Hidden heading was excluded twice');
});

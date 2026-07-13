import test from 'ava';
import { SmartSources } from '../smart_sources.js';
import { normalize_exclusion_list } from '../utils/exclusions.js';

const comma_file_path = 'Cases/Lastname, Firstname/Doe v. X, 193 S.W.3d 727, 727 (Tex. App. 2006).md';
const comma_folder_path = 'Cases/Lastname, Firstname/**';

function create_sources(settings = {}) {
  const env = {
    env_data_dir: '.smart-env',
    settings: { smart_sources: settings },
    create_env_getter(target) {
      Object.defineProperty(target, 'env', { value: env });
    },
  };
  return new SmartSources(env);
}

test('normalize_exclusion_list supports arrays and legacy CSV strings', (t) => {
  t.deepEqual(
    normalize_exclusion_list([comma_file_path, ` ${comma_file_path} `]),
    [comma_file_path],
  );
  t.deepEqual(
    normalize_exclusion_list('alpha, ,beta,/,**,/**,alpha'),
    ['alpha', 'beta'],
  );
});

test('file exclusions prefer the array-backed list and still read legacy CSV', (t) => {
  const list_sources = create_sources({ file_exclusions_list: [comma_file_path] });
  const legacy_sources = create_sources({ file_exclusions: 'a.md, b.md, /, **' });
  const cleared_sources = create_sources({
    file_exclusions: 'legacy.md',
    file_exclusions_list: [],
  });

  t.deepEqual(list_sources.file_exclusions, [comma_file_path]);
  t.true(list_sources.excluded_patterns.includes(`${comma_file_path}**`));
  t.deepEqual(legacy_sources.file_exclusions, ['a.md', 'b.md']);
  t.deepEqual(cleared_sources.file_exclusions, []);
});

test('folder exclusions prefer the array-backed list and normalize legacy folders', (t) => {
  const list_sources = create_sources({ folder_exclusions_list: [comma_folder_path] });
  const legacy_sources = create_sources({ folder_exclusions: 'folder, nested/, /**' });
  const cleared_sources = create_sources({
    folder_exclusions: 'LegacyFolder',
    folder_exclusions_list: [],
  });

  t.deepEqual(list_sources.folder_exclusions, [comma_folder_path]);
  t.deepEqual(legacy_sources.folder_exclusions, ['folder/', 'nested/']);
  t.deepEqual(cleared_sources.folder_exclusions, []);
});

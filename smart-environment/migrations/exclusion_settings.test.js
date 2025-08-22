import test from 'ava';
import { migrate_exclusion_settings_2025_08_22 } from 'exclusion_settings.js';

test('migrate_exclusion_settings moves root exclusions to modules', t => {
  const settings = {
    file_exclusions: 'a.md',
    folder_exclusions: 'Foo',
    excluded_headings: 'Secret',
    smart_sources: { min_chars: 1 },
    smart_blocks: { embed_blocks: true },
  };
  migrate_exclusion_settings_2025_08_22(settings);
  t.is(settings.smart_sources.file_exclusions, 'a.md');
  t.is(settings.smart_sources.folder_exclusions, 'Foo');
  t.is(settings.smart_blocks.excluded_headings, 'Secret');
  t.false('file_exclusions' in settings);
  t.false('folder_exclusions' in settings);
  t.false('excluded_headings' in settings);
});
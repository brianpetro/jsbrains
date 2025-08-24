import test from 'ava';
import { migrate_exclusion_settings_2025_08_22 } from './exclusion_settings.js';

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
  t.is(settings.smart_sources.excluded_headings, 'Secret');
  t.false('file_exclusions' in settings);
  t.false('folder_exclusions' in settings);
  t.false('excluded_headings' in settings);
});

test('migrate_exclusion_settings does not overwrite existing smart_sources exclusion settings', t => {
  const settings = {
    file_exclusions: 'a.md',
    folder_exclusions: 'Foo',
    excluded_headings: 'Secret',
    smart_sources: { 
      file_exclusions: 'existing.md', 
      folder_exclusions: 'ExistingFolder',
      excluded_headings: 'ExistingSecret',
      min_chars: 1 
    },
    smart_blocks: { embed_blocks: true },
  };
  migrate_exclusion_settings_2025_08_22(settings);
  
  // Should preserve existing values, not overwrite them
  t.is(settings.smart_sources.file_exclusions, 'existing.md');
  t.is(settings.smart_sources.folder_exclusions, 'ExistingFolder');
  t.is(settings.smart_sources.excluded_headings, 'ExistingSecret');
  
  // Original properties should still be removed
  t.false('file_exclusions' in settings);
  t.false('folder_exclusions' in settings);
  t.false('excluded_headings' in settings);
});

test('migrate_exclusion_settings overwrites "Untitled" exclusions with root settings', t => {
  const settings = {
    file_exclusions: 'a.md',
    folder_exclusions: 'Foo',
    excluded_headings: 'Secret',
    smart_sources: { 
      file_exclusions: 'Untitled', 
      min_chars: 1 
    },
    smart_blocks: { embed_blocks: true },
  };
  migrate_exclusion_settings_2025_08_22(settings);
  
  // Should overwrite "Untitled" with the value from settings.file_exclusions
  t.is(settings.smart_sources.file_exclusions, 'a.md');
  
  // Original property should still be removed
  t.false('file_exclusions' in settings);
  t.false('folder_exclusions' in settings);
  t.false('excluded_headings' in settings);
});


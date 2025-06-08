import test from 'ava';
import { glob_to_regex } from "./glob_to_regex.js";


test('glob_to_regex should return a RegExp object', t => {
    const regex = glob_to_regex('*.js');
    t.true(regex instanceof RegExp);
});

test('glob_to_regex should create a regex that matches correctly', t => {
    const regex = glob_to_regex('*.js');
    t.true(regex.test('file.js'));
    t.false(regex.test('file.txt'));
});

test('glob_to_regex should handle options correctly', t => {
    const regex = glob_to_regex('*.JS', { case_sensitive: false, windows_paths: true });
    t.true(regex.test('file.js'));
    t.true(regex.test('path\\to\\file.JS'));
});

// test('glob_to_regex should handle complex patterns', t => {
//     const regex = glob_to_regex('**/@(src|lib)/**/!(*.test|*.spec).+(js|ts)', { extended_glob: true });
//     t.true(regex.test('project/src/utils/helper.js'));
//     t.true(regex.test('project/lib/components/Button.ts'));
//     t.false(regex.test('project/src/tests/helper.test.js'));
// });

test('glob_to_regex safely handles file paths with brackets and special regex chars', t => {
  const problematic_path_1 = String.raw`^Z - ARCHIVE\/People Files\/Joseph \(Me\)\/2018-06-25 Google Personal Information Download\/Takeout\/Drive\/00-CLOUDSIGNS\/CloudSigns Archive\/CloudSigns Demo Assets\/CloudSigns Demo Assets Folder\/CloudSignsDEMO\/Sign\/assets\/ed-10155332_623694644387646_4217760740425848280_n[\.jpg\*\%\$`;
  // This should NOT throw an error
  t.notThrows(() => {
    glob_to_regex(problematic_path_1);
  });
  const problematic_path_2 = `d1 Prive/50-59 Christianity and religion/54 Christianity and society/{ Staan in de wereld van nu_d1.54.96/De ongelooflijke podcast - 206 - Tegeltuinen.md`;
  t.notThrows(() => {
    glob_to_regex(problematic_path_2);
  });
  
});

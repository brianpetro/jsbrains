import test from 'ava';
import { match_glob } from './match_glob.js';

test('welcome** should match welcome.txt', t => {
    t.true(match_glob('welcome**', 'welcome.txt'));
});

test('**/.** should match hidden files and folders in subdirectories', t => {
    t.true(match_glob('**/.**', 'some/hidden/.file.txt'));
});

test('*.js should match file.js', t => {
    t.true(match_glob('*.js', 'file.js'));
});

test('*.js should not match file.txt', t => {
    t.false(match_glob('*.js', 'file.txt'));
});

test('file?.js should match file1.js', t => {
    t.true(match_glob('file?.js', 'file1.js'));
});

test('file?.js should match fileA.js', t => {
    t.true(match_glob('file?.js', 'fileA.js'));
});

test('file?.js should not match file10.js', t => {
    t.false(match_glob('file?.js', 'file10.js'));
});

test('file[abc].js should match filea.js', t => {
    t.true(match_glob('file[abc].js', 'filea.js'));
});

test('file[abc].js should match fileb.js', t => {
    t.true(match_glob('file[abc].js', 'fileb.js'));
});

test('file[abc].js should not match filed.js', t => {
    t.false(match_glob('file[abc].js', 'filed.js'));
});

test('file[!xyz].js should match filea.js', t => {
    t.true(match_glob('file[!xyz].js', 'filea.js'));
});

test('file[!xyz].js should not match filex.js', t => {
    t.false(match_glob('file[!xyz].js', 'filex.js'));
});

test('**/*.js should match path/to/file.js', t => {
    t.true(match_glob('**/*.js', 'path/to/file.js'));
});

test('**/test/*.js should match deeply/nested/test/file.js', t => {
    t.true(match_glob('**/test/*.js', 'deeply/nested/test/file.js'));
});

test('**/test/*.js should not match deeply/nested/file.js', t => {
    t.false(match_glob('**/test/*.js', 'deeply/nested/file.js'));
});

test('*.{js,ts} should match file.js', t => {
    t.true(match_glob('*.{js,ts}', 'file.js'));
});

test('*.{js,ts} should match file.ts', t => {
    t.true(match_glob('*.{js,ts}', 'file.ts'));
});

test('*.{js,ts} should not match file.py', t => {
    t.false(match_glob('*.{js,ts}', 'file.py'));
});

test('**/*.[jt]s should match path/to/file.js', t => {
    t.true(match_glob('**/*.[jt]s', 'path/to/file.js'));
});

test('**/*.[jt]s should match path/to/file.ts', t => {
    t.true(match_glob('**/*.[jt]s', 'path/to/file.ts'));
});

test('**/*.[jt]s should not match path/to/file.py', t => {
    t.false(match_glob('**/*.[jt]s', 'path/to/file.py'));
});

test('file.js should match file.js', t => {
    t.true(match_glob('file.js', 'file.js'));
});

test('file.js should not match file.js.map', t => {
    t.false(match_glob('file.js', 'file.js.map'));
});

test('*.JS should match file.JS', t => {
    t.true(match_glob('*.JS', 'file.JS'));
});

test('*.JS should not match file.js', t => {
    t.false(match_glob('*.JS', 'file.js'));
});

test('file\\.js should match file.js', t => {
    t.true(match_glob('file\\.js', 'file.js'));
});

test('file\\.js should not match filex.js', t => {
    t.false(match_glob('file\\.js', 'filex.js'));
});

test('**/*.[!d][!l][!l] should match path/to/file.js', t => {
    t.true(match_glob('**/*.[!d][!l][!l]', 'path/to/file.js'));
});

test('**/*.[!d][!l][!l] should not match path/to/file.dll', t => {
    t.false(match_glob('**/*.[!d][!l][!l]', 'path/to/file.dll'));
});

test('empty pattern should match empty string', t => {
    t.true(match_glob('', ''));
});

test('empty pattern should not match something', t => {
    t.false(match_glob('', 'something'));
});

test('* should not match empty string', t => {
    t.false(match_glob('*', ''));
});

test('* should match anything', t => {
    t.true(match_glob('*', 'anything'));
});

test('** should match anything/at/all', t => {
    t.true(match_glob('**', 'anything/at/all'));
});

test('a**b should not match ac/b', t => {
    t.false(match_glob('a**b', 'ac/b'));
});

test('a**b should match aXb', t => {
    t.true(match_glob('a**b', 'aXb'));
});

test('a**b should match a/X/b', t => {
    t.true(match_glob('a**b', 'a/X/b'));
});

test('a*b should match aXb', t => {
    t.true(match_glob('a*b', 'aXb'));
});

test('a*b should not match a/X/b', t => {
    t.false(match_glob('a*b', 'a/X/b'));
});

test('a[X]b should match aXb', t => {
    t.true(match_glob('a[X]b', 'aXb'));
});

test('a[X]b should not match aYb', t => {
    t.false(match_glob('a[X]b', 'aYb'));
});

test('a[!X]b should not match aXb', t => {
    t.false(match_glob('a[!X]b', 'aXb'));
});

test('a[!X]b should match aYb', t => {
    t.true(match_glob('a[!X]b', 'aYb'));
});

test('a[\\]]b should match a]b', t => {
    t.true(match_glob('a[\\]]b', 'a]b'));
});

test('case-insensitive matching', t => {
    t.true(match_glob('*.js', 'FILE.JS', { case_sensitive: false }));
});

test('extended glob: +(...)', t => {
    t.true(match_glob('+(ab|cd).js', 'ab.js', { extended_glob: true }));
    t.true(match_glob('+(ab|cd).js', 'cd.js', { extended_glob: true }));
    t.true(match_glob('+(ab|cd).js', 'abcd.js', { extended_glob: true }));
    t.false(match_glob('+(ab|cd).js', 'ac.js', { extended_glob: true }));
});

test('extended glob: !(...)', t => {
    t.true(match_glob('!(*.js)', 'file.txt', { extended_glob: true }));
    t.false(match_glob('!(*.js)', 'file.js', { extended_glob: true }));
});

test('extended glob: @(...)', t => {
    t.true(match_glob('@(ab|cd).js', 'ab.js', { extended_glob: true }));
    t.true(match_glob('@(ab|cd).js', 'cd.js', { extended_glob: true }));
    t.false(match_glob('@(ab|cd).js', 'ac.js', { extended_glob: true }));
});

test('windows paths', t => {
    t.true(match_glob('path\\to\\*.js', 'path\\to\\file.js', { windows_paths: true }));
    t.true(match_glob('path/to/*.js', 'path\\to\\file.js', { windows_paths: true }));
});

test('complex pattern with all options', t => {
    const pattern = '**/@(src|lib)/**/!(*.test|*.spec).+(js|ts)';
    const options = { case_sensitive: false, extended_glob: true, windows_paths: true };
    
    t.true(match_glob(pattern, 'project/src/utils/helper.js', options));
    t.true(match_glob(pattern, 'PROJECT\\LIB\\COMPONENTS\\Button.TS', options));
    t.false(match_glob(pattern, 'project/src/tests/helper.test.js', options));
    t.false(match_glob(pattern, 'project/build/output.css', options));
});


/**
 * Test that special characters in glob patterns (like parentheses and percent signs)
 * do not cause an "Invalid regular expression" SyntaxError.
 */
test('should handle special characters like parentheses and percent signs in pattern', t => {
  // Simulate the problematic pattern similar to the screenshot:
  // e.g. "**/ARCHIVE/People Files/Joseph (\\% )/2018-06-25 Google Personal Information/**"
  const pattern = '**/ARCHIVE/People Files/Joseph (\\% )/2018-06-25*/**';

  // A path that includes parentheses, percent, and other chars
  const filePath = 'SomeRoot/ARCHIVE/People Files/Joseph (\\% )/2018-06-25 Google Personal Information Download/test.txt';

  // If match_glob or glob_to_regex produce an invalid RegExp, this will throw.
  try {
    // We only care that it does not blow up with a SyntaxError. Checking boolean:
    const matches = match_glob(pattern, filePath);
    t.true(matches, 'Match should succeed without throwing a SyntaxError');
  } catch (err) {
    t.fail(`Unexpected error: ${err.message}`);
  }
});

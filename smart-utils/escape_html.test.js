import test from 'ava';
import { escape_html } from './escape_html.js';

test('escape_html converts special chars', t => {
  const html = '<div>Tom & "Jerry"</div>';
  const out = escape_html(html);
  t.is(out, '&lt;div&gt;Tom &amp; &quot;Jerry&quot;&lt;/div&gt;');
});

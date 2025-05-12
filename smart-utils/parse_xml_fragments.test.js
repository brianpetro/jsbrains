import test from 'ava';
import { parse_xml_fragments } from './parse_xml_fragments.js';

test('parses xml', t => {
  const xml =
    '<action><msg>Hello</msg><count>3</count><flag>true</flag></action>';
  const out = parse_xml_fragments(xml);
  t.deepEqual(out, {
    action: {
      contents: {
        msg: { contents: 'Hello' },
        count: { contents: 3 },
        flag: { contents: true }
      }
    }
  });
});

/* repeated tags → array --------------------------------------------- */
test('repeated child tags produce array', t => {
  const xml = '<col><item>one</item><item>two</item><item>three</item></col>';
  const out = parse_xml_fragments(xml);
  t.deepEqual(out, {
    col: {
      contents: {
        item: [
          { contents: 'one' },
          { contents: 'two' },
          { contents: 'three' }
        ]
      }
    }
  });
});

/* nesting ------------------------------------------------------------ */
test('nested children parsed recursively', t => {
  const xml = '<wrap><a><b>5</b><c>false</c></a><d/></wrap>';
  const out = parse_xml_fragments(xml);
  t.deepEqual(out, {
    wrap: {
      contents: {
        a: {
          contents: {
            b: { contents: 5 },
            c: { contents: false }
          }
        },
        d: { contents: null }
      }
    }
  });
});

/* self-closing tag --------------------------------------------------- */
test('self-closing tag resolved to null', t => {
  const xml = '<root><empty /></root>';
  const out = parse_xml_fragments(xml);
  t.deepEqual(out, { root: { contents: { empty: { contents: null } } } });
});

/* autodetect root tag ------------------------------------------------ */
test('autodetects root when not supplied', t => {
  const xml = '<xyz><val>42</val></xyz>';
  t.deepEqual(parse_xml_fragments(xml), {
    xyz: { contents: { val: { contents: 42 } } }
  });
});

/* malformed xml (mismatched) ---------------------------------------- */
test('mismatched closing tag yields null', t => {
  t.is(parse_xml_fragments('<a><b></a>'), null);
});

/* attributes --------------------------------------------------------- */
test('handles attributes on tags', t => {
  const xml =
    '<root data-x="1"><item id="7">foo</item><img src="bar" /></root>';
  const out = parse_xml_fragments(xml);
  t.deepEqual(out, {
    root: {
      attributes: { 'data-x': 1 },
      contents: {
        item: { attributes: { id: 7 }, contents: 'foo' },
        img: { attributes: { src: 'bar' }, contents: null }
      }
    }
  });
});

/* multi-root --------------------------------------------------------- */
test('handles multiple top-level elements parsed', t => {
  const xml = '<a>1</a><b>2</b>';
  t.deepEqual(parse_xml_fragments(xml), {
    a: { contents: 1 },
    b: { contents: 2 }
  });
});

/* free text ignored -------------------------------------------------- */
test('ignores text outside tags', t => {
  const xml = 'hello<a>1</a>world';
  t.deepEqual(parse_xml_fragments(xml), { a: { contents: 1 } });
});

/* attribute type coercion ------------------------------------------- */
test('attributes remain strings unless explicitly numeric', t => {
  const xml = '<root bar="007" baz="true" qux="3.14"></root>';
  const out = parse_xml_fragments(xml);
  t.deepEqual(out, {
    root: {
      attributes: { bar: '007', baz: true, qux: 3.14 },
      contents: null
    }
  });
});

/* repeated top-level same tag → array ------------------------------- */
test('duplicate top-level elements collapse into array', t => {
  const xml = '<item>1</item><item>2</item>';
  t.deepEqual(parse_xml_fragments(xml), {
    item: [{ contents: 1 }, { contents: 2 }]
  });
});

/* whitespace trimmed ------------------------------------------------ */
test('extraneous whitespace inside text nodes trimmed', t => {
  const xml = '<a>  text   </a>';
  t.deepEqual(parse_xml_fragments(xml), { a: { contents: 'text' } });
});

/* self-closing tag with attributes ---------------------------------- */
test('self-closing tag with attributes parsed', t => {
  const xml = '<root><img src="foo" /></root>';
  const out = parse_xml_fragments(xml);
  t.deepEqual(out, {
    root: { contents: { img: { attributes: { src: 'foo' }, contents: null } } }
  });
});

/* xml comments ignored ---------------------------------------------- */
test('comments ignored', t => {
  const xml = '<root><!-- secret --><val>1</val></root>';
  t.deepEqual(parse_xml_fragments(xml), {
    root: { contents: { val: { contents: 1 } } }
  });
});

/* unclosed tag (new behaviour) -------------------------------------- */
test('unclosed tag treated as closed at EOF', t => {
  const xml = '<action><msg>Hello';
  const out = parse_xml_fragments(xml);
  t.deepEqual(out, {
    action: { contents: { msg: { contents: 'Hello' } } }
  });
  const xml2 = '<think>Some thoughts...';
  const out2 = parse_xml_fragments(xml2);
  t.deepEqual(out2, {
    think: { contents: 'Some thoughts...' }
  });
});

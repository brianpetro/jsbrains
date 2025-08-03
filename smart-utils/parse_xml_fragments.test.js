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

/* single-quoted attributes ------------------------------------------- */
test('handles single-quoted attribute values', t => {
  const xml = "<root data='alpha' count='7'></root>";
  const out = parse_xml_fragments(xml);
  t.deepEqual(out, {
    root: { attributes: { data: 'alpha', count: 7 }, contents: null }
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

/* invalid input ------------------------------------------------------ */
test('returns null for empty or null input', t => {
  t.is(parse_xml_fragments(''), null);
  t.is(parse_xml_fragments(null), null);
});

test('returns null for non-string input types', t => {
  t.is(parse_xml_fragments(123), null);
  t.is(parse_xml_fragments({ foo: 'bar' }), null);
});

test('should handle mixed content with text and tags', t => {
  const xml = "<think>\nOkay, so I need to figure out how to respond to the user's query using the given structure. The user provided some instructions on how to create an XML response for the action 'lookup_context'. Let me break it down step by step.\n\nFirst, I see that they want exactly three hypothetical notes, each with their own set of breadcrumbs. Each hypothetical note must start with a unique folder and file name combination, so I can't repeat any parts from one another.\n\nThey also mentioned using the in_folder parameter only if absolutely necessary, but it's preferred to exclude it. Since my task is just to generate three hypothetical notes without specific in_folder data, maybe I don't need that parameter here.\n\nNow, thinking about what each hypothetical note could be. They should be semantically similar since they're based on user notes. Let me brainstorm some common areas where notes might be stored. Maybe health records, financial information, and school records? That sounds diverse enough for three different folders.\n\nFor the first note, maybe something like \"Health > Diaries > Fitness Tracker\" would work because it's a common place to store personal health data over time. The second could be \"Finance > Budgeting > Monthly Expenses\" since tracking finances is another frequent area. Lastly, \"Education > Schoolwork > Notes and Assignments\" makes sense for academic notes.\n\nPutting this together, each hypothetical note starts with its respective folder combination, followed by the file name as the content of that folder. I need to make sure each one is unique and doesn't share any parts with the others.\n\nSo putting it into XML structure, each <hypothetical_x> tag will have a value that includes the folders and file name in the format specified: HYPOTHETICAL FOLDER NAME > CHILD FOLDER NAME > FILE NAME: HYPOTHETICAL NOTE CONTENTS.\n\nI think that covers all the requirements. I should double-check to make sure there are exactly three, each with unique breadcrumbs, and no overlap between them. That way, the XML response will be correct as per the instructions.\n</think>\n\n<lookup_context>\n  <hypothetical_1>Health > Diaries > Fitness Tracker: User's weekly fitness goals and activities tracked over time.</hypothetical_1>\n  <hypothetical_2>Finance > Budgeting > Monthly Expenses: Detailed breakdown of monthly financial expenses categorized by type.</hypothetical_2>\n  <hypothetical_3>Education > Schoolwork > Notes and Assignments: Comprehensive collection of academic notes and assignments from various classes.</hypothetical_3>\n</lookup_context>";
  const out = parse_xml_fragments(xml);

  const expected = {
    think: {
      contents:
        "Okay, so I need to figure out how to respond to the user's query using the given structure. The user provided some instructions on how to create an XML response for the action 'lookup_context'. Let me break it down step by step.\n\nFirst, I see that they want exactly three hypothetical notes, each with their own set of breadcrumbs. Each hypothetical note must start with a unique folder and file name combination, so I can't repeat any parts from one another.\n\nThey also mentioned using the in_folder parameter only if absolutely necessary, but it's preferred to exclude it. Since my task is just to generate three hypothetical notes without specific in_folder data, maybe I don't need that parameter here.\n\nNow, thinking about what each hypothetical note could be. They should be semantically similar since they're based on user notes. Let me brainstorm some common areas where notes might be stored. Maybe health records, financial information, and school records? That sounds diverse enough for three different folders.\n\nFor the first note, maybe something like \"Health > Diaries > Fitness Tracker\" would work because it's a common place to store personal health data over time. The second could be \"Finance > Budgeting > Monthly Expenses\" since tracking finances is another frequent area. Lastly, \"Education > Schoolwork > Notes and Assignments\" makes sense for academic notes.\n\nPutting this together, each hypothetical note starts with its respective folder combination, followed by the file name as the content of that folder. I need to make sure each one is unique and doesn't share any parts with the others.\n\nSo putting it into XML structure, each <hypothetical_x> tag will have a value that includes the folders and file name in the format specified: HYPOTHETICAL FOLDER NAME > CHILD FOLDER NAME > FILE NAME: HYPOTHETICAL NOTE CONTENTS.\n\nI think that covers all the requirements. I should double-check to make sure there are exactly three, each with unique breadcrumbs, and no overlap between them. That way, the XML response will be correct as per the instructions."
    },
    lookup_context: {
      contents: {
        hypothetical_1: {
          contents:
            "Health > Diaries > Fitness Tracker: User's weekly fitness goals and activities tracked over time."
        },
        hypothetical_2: {
          contents:
            "Finance > Budgeting > Monthly Expenses: Detailed breakdown of monthly financial expenses categorized by type."
        },
        hypothetical_3: {
          contents:
            "Education > Schoolwork > Notes and Assignments: Comprehensive collection of academic notes and assignments from various classes."
        }
      }
    }
  };

  t.deepEqual(out, expected);
});

test('parses xml wrapped in ```xml', t => {
  const xml =
    '```xml\n<action><msg>Hello</msg><count>3</count><flag>true</flag></action>\n```';
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

test('parses xml wrapped in generic code fence', t => {
  const xml = '```\n<action><msg>Hello</msg></action>\n```';
  const out = parse_xml_fragments(xml);
  t.deepEqual(out, {
    action: { contents: { msg: { contents: 'Hello' } } }
  });
});

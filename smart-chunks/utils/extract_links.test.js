const test = require('ava');
const { extract_links } = require('./extract_links');

test('extract_links should extract markdown links correctly', t => {
    const document_text = `
        This is a [link](http://example.com) in markdown.
        Another [example](https://example.org).
    `;
    const expected = [
        { title: 'link', target: 'http://example.com', line: 2 },
        { title: 'example', target: 'https://example.org', line: 3 }
    ];
    const result = extract_links(document_text);
    t.deepEqual(result, expected);
});

test('extract_links should extract wikilinks correctly', t => {
    const document_text = `
        This is a [[Page1]] link.
        Another [[Page2|Custom Title]] link.
    `;
    const expected = [
        { title: 'Page1', target: 'Page1', line: 2 },
        { title: 'Custom Title', target: 'Page2', line: 3 }
    ];
    const result = extract_links(document_text);
    t.deepEqual(result, expected);
});

test('extract_links should handle mixed links correctly', t => {
    const document_text = `
        This is a [markdown link](http://example.com) and a [[Wikilink]].
        Another [example](https://example.org) and [[Page2|Custom Title]].
    `;
    const expected = [
        { title: 'markdown link', target: 'http://example.com', line: 2 },
        { title: 'Wikilink', target: 'Wikilink', line: 2 },
        { title: 'example', target: 'https://example.org', line: 3 },
        { title: 'Custom Title', target: 'Page2', line: 3 }
    ];
    const result = extract_links(document_text);
    t.deepEqual(result, expected);
});

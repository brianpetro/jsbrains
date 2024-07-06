function extract_links(document_text) {
    const markdown_link_pattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    const wikilink_pattern = /\[\[([^\|\]]+)(?:\|([^\]]+))?\]\]/g;
    const result = [];

    const extract_links_from_pattern = (pattern, type) => {
        let match;
        while ((match = pattern.exec(document_text)) !== null) {
            const title = type === 'markdown' ? match[1] : (match[2] || match[1]);
            const target = type === 'markdown' ? match[2] : match[1];
            const line = document_text.substring(0, match.index).split('\n').length;
            result.push({ title, target, line });
        }
    };

    extract_links_from_pattern(markdown_link_pattern, 'markdown');
    extract_links_from_pattern(wikilink_pattern, 'wikilink');

    result.sort((a, b) => a.line - b.line || a.target.localeCompare(b.target));

    return result;
}

exports.extract_links = extract_links;
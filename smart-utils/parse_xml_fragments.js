// C:/Users/brian/Documents/jsbrains/smart-utils/parse_xml_fragments.js
import { coerce_primitives } from './coerce_primitives.js';

/**
 * Parses XML fragments into a nested plain-object representation.
 *
 * Each XML element becomes a key whose value is an object that may contain
 *   - attributes  – an object of coerced attribute values (omitted when empty)
 *   - contents    – either:
 *       • another map of child elements
 *       • a coerced primitive/text value
 *       • null for self-closing or empty elements
 *
 * Repeated sibling tags collapse into arrays. Text outside any tag is ignored.
 * Unclosed tags are treated as implicitly closed at the end of input.
 * Mismatched closing tags return null.
 *
 * @param {string} xml_input raw XML string or fragment
 * @returns {object|null} structured representation or null if invalid
 */
export function parse_xml_fragments (xml_input) {
  if (typeof xml_input !== 'string' || xml_input.trim() === '') {
    return null;
  }

  /* helpers ----------------------------------------------------------- */
  const compress_whitespace = (str) => str.replace(/\s+/g, ' ').trim();

  const parse_attributes = (str) => {
    if (!str) return {};
    const attr_map = {};
    const attr_re = /(\w[\w.\-]*)\s*=\s*"([^"]*)"/g;
    let m;
    while ((m = attr_re.exec(str)) !== null) {
      const [, key, raw_val] = m;
      attr_map[key] = coerce_primitives(raw_val);
    }
    return attr_map;
  };

  const attach_child = (map, tag, node) => {
    if (tag in map) {
      const existing = map[tag];
      if (Array.isArray(existing)) {
        existing.push(node);
      } else {
        map[tag] = [existing, node];
      }
    } else {
      map[tag] = node;
    }
  };

  const finalize_node = (ctx) => {
    const trimmed_text = compress_whitespace(ctx.text);

    if (Object.keys(ctx.children_map).length) {
      ctx.node.contents = ctx.children_map;
    } else if (trimmed_text !== '') {
      ctx.node.contents = coerce_primitives(trimmed_text);
    } else {
      ctx.node.contents = null;
    }
  };

  /* main parsing loop ------------------------------------------------- */
  const comment_re = /<!--[\s\S]*?-->/g;
  const cleaned = xml_input.replace(comment_re, '');

  /* negative look-behind ensures we avoid comment internals ----------- */
  const token_re =
    /<\/?[A-Za-z_][\w.\-]*(?:\s+[^<>]*?)?\/?>(?<!<![^>]*>)|[^<>]+/g;

  const root_map = {};
  const stack = [];

  let match;
  while ((match = token_re.exec(cleaned)) !== null) {
    const token = match[0];

    if (token.startsWith('<')) {
      /* tag token ---------------------------------------------------- */
      if (token.startsWith('</')) {
        /* closing tag ------------------------------------------------ */
        const tag_name = token.slice(2, -1).trim();
        if (stack.length === 0) return null; // stray close

        const ctx = stack.pop();
        if (ctx.tag_name !== tag_name) return null; // mismatched

        finalize_node(ctx);

        if (stack.length === 0) {
          attach_child(root_map, tag_name, ctx.node);
        } else {
          const parent_ctx = stack[stack.length - 1];
          attach_child(parent_ctx.children_map, tag_name, ctx.node);
        }
      } else {
        /* opening / self-closing tag -------------------------------- */
        const self_closing = token.endsWith('/>');
        const body = self_closing ? token.slice(1, -2) : token.slice(1, -1);
        const first_space = body.indexOf(' ');
        const tag_name = first_space === -1 ? body : body.slice(0, first_space);
        const attr_str = first_space === -1 ? '' : body.slice(first_space + 1);

        const attributes = parse_attributes(attr_str);
        const node = Object.keys(attributes).length ? { attributes } : {};

        if (self_closing) {
          node.contents = null;
          if (stack.length === 0) {
            attach_child(root_map, tag_name, node);
          } else {
            const parent_ctx = stack[stack.length - 1];
            attach_child(parent_ctx.children_map, tag_name, node);
          }
        } else {
          stack.push({
            tag_name,
            node,
            text: '',
            children_map: {}
          });
        }
      }
    } else {
      /* text token --------------------------------------------------- */
      if (stack.length > 0) {
        stack[stack.length - 1].text += token;
      }
      /* text outside all tags ignored */
    }
  }

  /* finalize any unclosed tags at EOF -------------------------------- */
  while (stack.length !== 0) {
    const ctx = stack.pop();
    finalize_node(ctx);
    if (stack.length === 0) {
      attach_child(root_map, ctx.tag_name, ctx.node);
    } else {
      const parent_ctx = stack[stack.length - 1];
      attach_child(parent_ctx.children_map, ctx.tag_name, ctx.node);
    }
  }

  return Object.keys(root_map).length ? root_map : null;
}

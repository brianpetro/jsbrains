# smart-contexts
A convenient interface for managing collections of items with context-building capabilities. This library allows you to compile items (such as files) and their relationships (links, inlinks, exclusions, etc.) into a single compiled 'context'. It supports excluding certain headings, generating hierarchical file trees, and handling inbound/outbound links to an arbitrary depth.

## Features
- **Context Building**: Aggregate item contents into a single string, with optional before/after templates at various levels.
- **Exclusion Logic**: Automatically removes or ignores 'excluded' headings (and their sections).
- **Link Tracking**: Supports a configurable depth of link traversal, both outbound (outlinks) and inbound (inlinks).
- **File Tree Injection**: Optionally generates a file tree of items and links that can be injected into your compiled output.
- **Flexible Templates**: Insert text or placeholders before/after the entire context, each item, or each link.


**Core Files:**
- **index.js**  
  Exports the `SmartContexts` and `SmartContext` classes.
- **smart_contexts.js**  
  Defines and configures the `SmartContexts` collection class.
- **smart_context.js**  
  Implements the `SmartContext` item class, including compile logic that brings together items and link data.
- **utils/build_context.js**  
  Gathers items and link contents into one final string, applying user-supplied 'before'/'after' templates.
- **utils/respect_exclusions.js**  
  Strips out sections from items or links based on excluded headings.


## Usage

Below is a minimal example demonstrating how to create a `SmartContexts` collection, add a context item, and compile it.

```js
import { SmartContexts, SmartContext } from 'smart-contexts';

// Create a new SmartContexts collection with default settings
const myContexts = new SmartContexts({
  link_depth: 1,
  inlinks: true,
  excluded_headings: ['*Secret*', 'Draft']
});

// Add a new SmartContext item
const ctx = myContexts.add_item({
  key: 'example',
  items: {
    'notes/example.md': true, // boolean indicates "include this file"
    'notes/other.md': true
  },
});

// The compile() method merges settings, processes items, follows links (if any), and respects exclusions
(async () => {
  const result = await ctx.compile();
  console.log('Final context output:\n', result.context);
  console.log('Stats:', result.stats);
})();
```


## API

### SmartContexts
- **default_settings**  
  Default options for link traversal, heading exclusions, and optional before/after text templates.

- **item_type**  
  Returns the item class used by the collection (i.e., `SmartContext`).


### SmartContext
**Key Methods**:
- **compile(opts = {})**  
  Performs the main flow:
  1. Merge collection settings and local `opts`.
  2. Load item contents into memory (`process_items`).
  3. Follow outbound links (and inbound links if `inlinks` = true) up to `link_depth`.
  4. Respect exclusions (via `respect_exclusions`).
  5. Generate final output using `build_context`.

- **get_ref(key)**  
  Fetches an object reference (e.g., a file or block) by key/path.

- **process_items(merged)**  
  Loads each item’s content and adds it to `merged.items`.

- **process_links(merged)**  
  Traverses links, merges them into `merged.links`, and optionally follows inbound links.

- **key**  
  Returns the user-specified `data.key` or a generated murmur-hash of the item set.


### build_context
1. Collects `opts.items` and `opts.links`.
2. Injects `before_context` and `after_context` around everything.
3. Injects `before_item` and `after_item` around each item’s raw content.
4. Injects `before_link` and `after_link` around each link’s raw content.
5. Produces a top-level `context` string and a `stats` object.

**Example**:
```js
import { build_context } from './utils/build_context.js';

const items = {
  'docs/intro.md': '# Introduction\nContent here\n',
  'docs/usage.md': '# Usage\nDetails here\n'
};

const links = {
  'docs/intro.md': {
    to: ['docs/usage.md'],
    content: 'This is a link from intro to usage',
    type: ['OUTLINK'],
    depth: [1]
  }
};

const { context, stats } = await build_context({ items, links });
console.log(context);
```


### respect_exclusions
- **excluded_headings** (array of glob patterns for matching headings)
- Mutates `opts.items` and optionally `opts.links` in-place to remove matched heading sections.


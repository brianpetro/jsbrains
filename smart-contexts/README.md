# smart-contexts
A convenient interface for managing collections of items with context-building capabilities. This library allows you to compile items (such as files) and their relationships (links, inlinks, exclusions, etc.) into a single compiled 'context'. It supports excluding certain headings, generating hierarchical file trees, and handling inbound/outbound links to an arbitrary depth.

## Features
- **Context Building**: Aggregate item contents into a single string, with optional before/after templates at various levels.
- **Exclusion Logic**: Automatically removes or ignores 'excluded' headings (and their sections).
- **Link Tracking**: Supports a configurable depth of link traversal, both outbound (outlinks) and inbound (inlinks).
- **File Tree Injection**: Optionally generates a file tree of items and links that can be injected into your compiled output.
- **Flexible Templates**: Insert text or placeholders before/after the entire context, each item, or each link.

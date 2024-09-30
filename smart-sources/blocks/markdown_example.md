# Top-Level Heading

### Level 3 Heading (Skipping Level 2)

Content under level 3 heading.

# Another Top-Level Heading

##### Level 5 Heading (Skipping Levels 2-4)

Content under level 5 heading.

## Second-Level Heading

##### Level 5 Child Heading

Some content here.

# Heading Without Content

### Subheading With Content

Content under subheading.

# Heading With Content

Content directly under this heading.

### Subheading Without Content

#### Sub-subheading With Content

More content.

# Empty H1

# List test heading

- should treat top-level list item as heading without including full line in property key
  - should work by appending \`#{n}\` to the end of the heading path
  - \`n\` is the nth list item within the same parent heading (starting count at 1)
- list items should be able to be indented to any depth
- single line top-level list items should be treated as heading
- multi-line top-level list items should contain line range of all sub-lines in list item
  - this sub-item belongs to \`#List test heading#{4}\`
  - the line range should include all lines to the next heading or list item

Paragraph after list item should be treated as next list item and contain line range of all paragraph lines until the next heading or list item.
This paragraph text in same as the above paragraph \`#List test heading#{5}\`

# Another Top-Level Heading

This subsequent occurrence of a top-level heading should be treated as a new top-level heading with a \`[n]\` where \`n\` is number of the occurrence in the document.
In this case, \`#Another Top-Level Heading[2]\`. No \`#\` separates the heading from the \`[n]\` suffix indicating that it is an adjacent heading (not nested).

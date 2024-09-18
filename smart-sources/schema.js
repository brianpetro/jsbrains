// Class definitions for reference
class SmartSources {
  // Represents the collection of SmartSource items
  // Includes methods for managing the collection
}

class SmartSource {
  // Represents a single SmartSource item in the collection
  // Includes methods for managing the source
}

class TextAdapter {}
class LinesAdapter {}

const smart_sources_schema = {
  "title": "SmartSources",
  "type": "object",
  "description": "Schema representing the SmartSources collection class/instance.",
  "properties": {
    "class": {
      "description": "Class definition for the SmartSources collection.",
      "type": "class",
      "example": SmartSources
    },
    "items": {
      "type": "array",
      "description": "Array of SmartSource items.",
      "items": {
        "$ref": "#/definitions/SmartSource"
      }
    },
    "methods": {
      "type": "object",
      "description": "Methods available on the SmartSources collection.",
      "properties": {
        "import": {
          "description": "Imports files into the collection.",
          "type": "function",
          "parameters": [
            {
              "name": "files",
              "type": "array",
              "items": { "type": "string" },
              "description": "Array of file paths to import."
            }
          ]
        },
        "search": {
          "description": "Searches the collection based on provided options.",
          "type": "function",
          "parameters": [
            {
              "name": "search_opts",
              "type": "object",
              "description": "Search options."
            }
          ]
        },
        "create": {
          "description": "Creates a new SmartSource in the collection.",
          "type": "function",
          "parameters": [
            {
              "name": "key",
              "type": "string",
              "description": "Key identifier for the new SmartSource."
            },
            {
              "name": "content",
              "type": "string",
              "description": "Content of the new SmartSource."
            }
          ]
        }
      }
    }
  },
  "required": ["class", "items", "methods"],
  "additionalProperties": true,
  "definitions": {
    "SmartSource": {
      "$ref": "#/definitions/SmartSourceItem"
    }
  }
};

const smart_source_schema = {
  "title": "SmartSource",
  "type": "object",
  "description": "Schema representing the SmartSource collection item class/instance.",
  "properties": {
    "key": {
      "type": "string",
      "description": "Unique identifier for the SmartSource."
    },
    "class": {
      "description": "Class definition for the SmartSource.",
      "type": "class",
      "example": SmartSource
    },
    "adapter": {
      "description": "Adapter used by the SmartSource.",
      "type": "class",
      "example": TextAdapter
    },
    "adapters": {
      "type": "array",
      "items": {
        "type": "class",
        "example": LinesAdapter
      },
      "description": "List of adapters for the SmartSource.",
      "example": [TextAdapter, LinesAdapter]
    },
    "exclusion_settings": {
      "type": "object",
      "description": "Exclusion settings for the SmartSource.",
      "properties": {
        "exclude_patterns": {
          "type": "array",
          "items": { "type": "string" },
          "description": "List of patterns to exclude."
        }
      },
      "additionalProperties": true
    },
    "data": {
      "type": "object",
      "description": "Data associated with the SmartSource.",
      "properties": {
        "stat": {
          "type": "object",
          "description": "File statistics.",
          "properties": {
            "ctime": { "type": "string", "description": "Creation time." },
            "mtime": { "type": "string", "description": "Modification time." },
            "size": { "type": "number", "description": "Size of the source in bytes." }
          },
          "required": ["mtime", "size"]
        },
        "hash": {
          "type": "string",
          "description": "Content hash of the source."
        },
        "blocks": {
          "type": "object",
          "description": "Blocks within the SmartSource.",
          "patternProperties": {
            "^[a-zA-Z0-9_/.-]+$": {
              "type": "object",
              "description": "Data for an individual block.",
              "properties": {
                "start": { "type": "number", "description": "Start line number." },
                "end": { "type": "number", "description": "End line number." },
                "hash": { "type": "string", "description": "Content hash of the block." }
              },
              "required": ["start", "end", "hash"]
            }
          },
          "additionalProperties": false
        }
      },
      "required": ["stat", "blocks"]
    },
    "methods": {
      "type": "object",
      "description": "Methods available on the SmartSource item.",
      "properties": {
        "parse_content": {
          "type": "function",
          "description": "Parses the content of the SmartSource.",
          "notes": "*Called by `init()`.*"
        },
        "search": {
          "type": "function",
          "description": "Searches within the SmartSource.",
          "parameters": [
            {
              "name": "search_opts",
              "type": "object",
              "description": "Search options."
            }
          ]
        },
        "read": {
          "type": "function",
          "description": "Reads the content of the SmartSource.",
          "parameters": [
            {
              "name": "opts",
              "type": "object",
              "description": "Options for reading.",
              "properties": {
                "no_changes": {
                  "type": ["string", "boolean"],
                  "enum": ["before", "after", true, false],
                  "description": "Specifies whether to include changes. *`before` is default, used when updating entity with unapproved change. `after` can be used to view pending changes.*"
                },
                "add_depth": {
                  "type": "number",
                  "description": "Adjusts heading levels or indentation."
                }
              }
            }
          ]
        },
        "update": {
          "type": "function",
          "description": "Updates the content of the SmartSource.",
          "parameters": [
            {
              "name": "content",
              "type": "string",
              "description": "New content for the SmartSource."
            },
            {
              "name": "opts",
              "type": "object",
              "description": "Options for updating."
            }
          ],
          "notes": "*Standard update method respecting source or block behaviors.*"
        },
        "destroy": {
          "type": "function",
          "description": "Deletes the SmartSource.",
          "notes": "*Standard destroy method for removing source or block.*"
        },
        "move_to": {
          "type": "function",
          "description": "Moves the SmartSource to a new location.",
          "parameters": [
            {
              "name": "entity",
              "type": "object",
              "description": "Destination entity."
            },
            {
              "name": "opts",
              "type": "object",
              "description": "Options for moving."
            }
          ],
          "notes": "*Maintains the same `file.name` and `headings` after moving to the destination unless specified. Maintains logical identifiers unless explicitly modified.*"
        }
      }
    }
  },
  "required": ["key", "class", "adapter", "data", "methods"],
  "additionalProperties": true
};
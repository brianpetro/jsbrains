class ExampleModule {}
class ExampleAdapter {}
const smart_env_config_schema = {
  "title": "smart_env_config",
  "type": "object",
  "properties": {
    "env_data_dir": {
      "type": "string",
      "description": "Relative path to the folder where environment data is stored.",
      "example": "/rel/path/to/dir"
    },
    "env_path": {
      "type": "string",
      "description": "Absolute path to the environment.",
      "example": "/path/to/env"
    },
    "modules": {
      "type": "object",
      "description": "Definitions of modules with their classes and adapters.",
      "patternProperties": {
        "^[a-zA-Z0-9_-]+$": {
          "oneOf": [
            {
              "type": "class",
              "description": "Module class definition.",
              "example": ExampleModule
            },
            {
              "type": "object",
              "description": "Module configuration object.",
              "properties": {
                "class": {
                  "description": "Class definition for the module.",
                  "type": "class",
                  "example": ExampleModule
                },
                "adapter": {
                  "description": "Adapter for the module.",
                  "type": "class",
                  "example": ExampleAdapter
                },
                "adapters": {
                  "type": "array",
                  "items": {
                    "type": "class",
                    "example": ExampleAdapter
                  },
                  "description": "List of adapters for the module.",
                  "example": [ExampleAdapter, ExampleAdapter]
                }
              },
              "required": ["class"],
              "additionalProperties": true
            }
          ]
        }
      },
      "additionalProperties": false
    },
    "collections": {
      "type": "object",
      "description": "Definitions of collections with their classes and configurations.",
      "patternProperties": {
        "^[a-zA-Z0-9_-]+$": {
          "oneOf": [
            {
              "type": "class",
              "description": "Collection class definition.",
              "example": ExampleModule
            },
            {
              "type": "object",
              "description": "Collection configuration object.",
              "properties": {
                "class": {
                  "description": "Class definition for the collection.",
                  "type": "class",
                  "example": ExampleModule
                },
                "item_type_key": {
                  "type": "string",
                  "description": "Custom item type key for the collection.",
                  "example": "custom_item_type"
                },
                "adapters": {
                  "type": "array",
                  "items": {
                    "type": "class",
                    "example": ExampleAdapter
                  },
                  "description": "List of adapters for the collection.",
                  "example": [ExampleAdapter, ExampleAdapter]
                }
              },
              "additionalProperties": true
            }
          ]
        }
      },
      "additionalProperties": false
    },
    "item_types": {
      "type": "object",
      "description": "Definitions of item types with their classes and configurations.",
      "patternProperties": {
        "^[a-zA-Z0-9_-]+$": {
          "oneOf": [
            {
              "type": "class",
              "description": "Item type class definition.",
              "example": ExampleModule
            },
            {
              "type": "object",
              "description": "Item type configuration object.",
              "properties": {
                "class": {
                  "description": "Class definition for the item type.",
                  "type": "class",
                  "example": ExampleModule
                },
                "item_type_key": {
                  "type": "string",
                  "description": "Custom item type key for the item type.",
                  "example": "custom_item_type_key"
                },
                "adapters": {
                  "type": "array",
                  "items": {
                    "type": "class",
                    "example": ExampleAdapter
                  },
                  "description": "List of adapters for the item type.",
                  "example": [ExampleAdapter, ExampleAdapter]
                }
              },
              "additionalProperties": true
            }
          ]
        }
      },
      "additionalProperties": false
    }
  },
  "required": ["env_path", "env_data_dir", "modules", "collections", "item_types"],
  "additionalProperties": true
}
const settings_config_schema = {
  "type": "object",
  "patternProperties": {
    "^[\\w\\[\\].-]+$": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string",
          "description": "Display name for the setting"
        },
        "type": {
          "type": "string",
          "enum": ["text", "string", "password", "number", "dropdown", "button", "toggle", "textarea", "folder", "text-file"],
          "description": "Type of input for the setting"
        },
        "description": {
          "type": "string",
          "description": "Detailed description of the setting"
        },
        "placeholder": {
          "type": "string",
          "description": "Placeholder text for input fields"
        },
        "options_callback": {
          "type": "string",
          "description": "Name of the function to call for populating dropdown options"
        },
        "callback": {
          "type": "string",
          "description": "Name of the function to call when the setting changes"
        },
        "is_scope": {
          "type": "boolean",
          "description": "Whether changing this setting should trigger a re-render"
        },
        "conditional": {
          "type": "string",
          "description": "Function name or condition for showing this setting"
        },
        "required": {
          "type": "boolean",
          "description": "Whether this setting is required"
        },
        "min": {
          "type": "number",
          "description": "Minimum value for number inputs"
        },
        "max": {
          "type": "number",
          "description": "Maximum value for number inputs"
        },
        "format": {
          "type": "string",
          "enum": ["array"],
          "description": "Special formatting for the input value"
        },
        "btn": {
          "type": "string",
          "description": "Text for an associated button"
        },
        "btn_callback": {
          "type": "string",
          "description": "Function to call when the associated button is clicked"
        },
        "btn_href": {
          "type": "string",
          "description": "URL to open when the associated button is clicked"
        },
        "btn_disabled": {
          "type": "boolean",
          "description": "Whether the associated button should be disabled"
        },
        "disabled": {
          "type": "boolean",
          "description": "Whether the input should be disabled"
        },
        "hidden": {
          "type": "boolean",
          "description": "Whether the setting should be hidden"
        },
        "tooltip": {
          "type": "string",
          "description": "Tooltip text for the setting"
        }
      },
      "required": ["name", "type"],
      "additionalProperties": false
    }
  },
  "additionalProperties": false
};
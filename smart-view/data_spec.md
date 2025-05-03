# data_spec.md

## `scope` Object

The `scope` object is a flexible structure provided by the calling application. The only requirement for this method is that `scope` has a `settings` property (type: `Object`).

Example:

```js
const scope = {
  settings: {
    env_settings: {
      some: {
        deep: {
          path: 'initialValue'
        }
      }
    }
  },
  // ... any additional properties needed by the application
};
```
### `data-smart-setting` Attribute

- **Type**: `string`
- **Format**: A dot-notation path indicating where the user-input data should be stored within `scope.settings`.
    - Example: `data-smart-setting="env_settings.deep.nestedKey"`
- **Behavior**: On an input change, the method `add_settings_listeners` updates `scope.settings` at that path to the latest input value.---

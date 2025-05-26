# API

## SmartView Class
### `add_settings_listeners(scope, container = document)`

Scans the given `container` for any form element (e.g. `input`, `select`, `textarea`) that has the attribute `data-smart-setting`. Each element is expected to have a dot-notation path in the attribute `data-smart-setting="env_settings.some.deep.path"`.

When a change event occurs on that element, this method updates the corresponding path within `scope.settings` using the `SmartView.set_by_path()` helper.

**Parameters**

- `scope` (Object): The scope object that must contain a `settings` property (an object).  
- `container` (HTMLElement, optional): The container within which to look for elements that have `data-smart-setting`. Defaults to the global `document`.

**Usage**

```js
smart_view.add_settings_listeners(scope, someContainer);
```

# data

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
---
sync external: ../jsbrains/smart-view/api_spec.md
---

# api_spec.md

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

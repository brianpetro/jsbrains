# API

## SmartView Class

### `add_settings_listeners(scope, container = document)`
Scans `container` for elements with `data-smart-setting` and updates `scope.settings` when the element changes using `SmartView.set_by_path()`.

#### Parameters
- `scope` **Object** – Contains a `settings` property.
- `container` **HTMLElement** *(optional)* – Element within which to search. Defaults to `document`.

#### Usage
```js
smart_view.add_settings_listeners(scope, someContainer);
```

Path helpers `get_by_path`, `set_by_path`, and `delete_by_path` are
re-exported from `smart-utils` for reuse across packages.

### `data-smart-setting` Attribute
- **Type**: `string`
- **Format**: Dot-notation path, e.g. `data-smart-setting="env_settings.deep.nestedKey"`
- **Behavior**: Updates the corresponding path in `scope.settings` on change.

## Node Adapter

### `SmartViewNodeAdapter`
Implements a minimal DOM environment for Node.js and browsers without Obsidian.

- `setting_class` – returns the `Setting` helper used by the adapter.
- `get_icon_html(icon_name)` – returns SVG markup from `lucide-static`. Falls back to PascalCase.
- `is_mod_event(event)` – detects `Ctrl` or `Cmd` key presses.
- `render_markdown(markdown, scope)` – basic fallback rendering returning a `<pre>` element.

### `Setting` helper
Replicates Obsidian's settings API with pure DOM elements.

- `add_text(fn)` – single line text input
- `add_dropdown(fn)` – `<select>` element
- `add_button(fn)` – simple button
- `add_toggle(fn)` – checkbox toggle
- `add_text_area(fn)` – multiline textarea
- `add_folder_select(fn)` – folder picker stub
- `add_file_select(fn)` – file picker stub
- `add_slider(fn)` – range slider

# smart-view Specification

API surface is documented with the following functions exported from `smart_view.js`:

| Function | Description |
| --- | --- |
| `build_html(scope, opts)` | Returns an HTML string for a component. |
| `render(scope, opts)` | Creates a DocumentFragment from HTML and delegates to `post_process`. |
| `post_process(scope, frag, opts)` | Adds event listeners and final DOM adjustments. |

Data objects passed to these functions are minimal and typically shaped like:

```js
{
  settings: {
    key: 'value'
  }
}
```

Adapters provide environment specific hooks. See `api_spec.md` and `data_spec.md` for detailed parameter definitions.

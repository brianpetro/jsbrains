# smart-model

A flexible base class for building "smart" models that handle configuration, state management, adapter loading, and model operations. Designed to provide a standardized interface, it simplifies creating specialized model classes (e.g., language models, ranking models) with different backends and adapters.

Base class for smart-*-model packages.

## Features
- Base `SmartModel` class manages:
  - Adapter lifecycle (load/unload)
  - Settings configuration and schema processing
  - State transitions (`unloaded`, `loading`, `loaded`, `unloading`)
- Extensible architecture for multiple adapters
- Centralized settings management and re-rendering triggers

## Folder Structure
```
smart-model
├── adapters
│   └── _adapter.js        # Base adapter class
├── components
│   └── settings.js        # Helper for rendering settings UIs
├── smart_model.js          # Core SmartModel class
├── test
│   └── smart_model.test.js # Unit tests for SmartModel
└── package.json
```

## Getting Started
```javascript
import { SmartModel } from 'smart-model';

const model = new SmartModel({
  adapters: { myAdapter: MyAdapterClass },
  settings: { model_key: 'my_model' },
  model_config: { adapter: 'myAdapter' }
});
await model.initialize(); // Loads adapter
```

## Extending
Subclass `SmartModel` to add domain logic:
```javascript
class MyCustomModel extends SmartModel {
  get default_model_key() { return 'my_model'; }
  async custom_method() {
    return await this.invoke_adapter_method('some_adapter_method');
  }
}
```

## Adapters
Adapters bridge between `SmartModel` and external APIs or local logic. Create a subclass of `SmartModelAdapter` and implement necessary methods (e.g., `load`, `rank`, `invoke_api_call`).

## Testing
Run tests:
```
npm test
```

## License
MIT
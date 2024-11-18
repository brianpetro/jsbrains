# Smart Model

Base class for smart-*-model packages.


## Usage

1. Create an instance of `SmartModel` with the required configuration options:
```javascript
const model = new SmartModel({
    adapters: { mock: MockAdapter },
    settings: { model_key: 'mock_model' },
    model_config: { adapter: 'mock' }
});
```

2. Initialize the model (loads the specified adapter):
```javascript
await model.initialize();
```

3. Use adapter-specific methods:
```javascript
const result = await model.invoke_adapter_method('mock_method', 'test input');
console.log(result); // "Processed: test input"
```




## State Transitions

The `SmartModel` instance has the following states:
- `unloaded`: No adapter is loaded.
- `loading`: Adapter is in the process of being loaded.
- `loaded`: Adapter has been successfully loaded.
- `unloading`: Adapter is in the process of being unloaded.

These states are managed automatically when calling `load` and `unload`.



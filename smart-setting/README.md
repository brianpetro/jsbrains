# Smart Settings

Smart Settings is a minimal dependency renderer for settings components designed for Smart Environments. It allows developers to create customizable settings interfaces with ease, leveraging the power of EJS templates and a flexible component system.

## Features

- **Minimal Dependency**: Designed to operate with low to no external dependencies, ensuring lightweight and secure integration.
- **Customizable Templates**: Use EJS templates to render settings interfaces, allowing for highly customizable and dynamic UIs.
- **Component-Based**: Provides a variety of components such as text inputs, dropdowns, toggles, and more to build settings interfaces.
- **Extendable**: Easily extend the base functionality to meet specific needs and requirements.
- **Ease of Development**: Simplifies the process of creating and managing settings interfaces, making it accessible for developers at various skill levels.

## Installation

To install Smart Settings, include it in your project dependencies:

```
npm install smart-setting
```

## Usage

To use Smart Settings, create an instance of the `SmartSettings` class and call the `render` method to display the settings interface. Customize the behavior by overriding methods and providing your own templates.

```
const settings = new SmartSettings(env, container, template_name);
settings.render();
```

## API

### SmartSettings

#### Constructor

`new SmartSettings(env, container, template_name)`

- `env`: The environment object containing necessary dependencies.
- `container`: The DOM element where the settings interface will be rendered.
- `template_name`: The name of the EJS template to use for rendering.

#### Methods

- `render()`: Renders the settings interface.
- `render_template(view_data)`: Renders the EJS template with the provided view data.
- `update(setting, value)`: Updates a setting with the given value and saves it.
- `render_components()`: Renders the individual components within the settings interface.
- `handle_on_change(setting, value, elm)`: Handles changes to settings and updates the interface accordingly.
- `get_setting(setting)`: Retrieves the value of a setting, falling back to defaults if necessary.

## License

Smart Settings is licensed under the MIT License.


## Acknowledgements

Smart Settings is developed and maintained by Brian Joseph Petro (🌴 Brian). Special thanks to all contributors and the open-source community for their support.

import { SmartViewAdapter } from "./_adapter.js";
import * as lucide from 'lucide-static';
import { safe_inner_html } from '../utils/safe_inner_html.js';
import { empty } from '../utils/empty.js';
import { to_pascal_case } from 'smart-utils/to_pascal_case.js';

export class SmartViewNodeAdapter extends SmartViewAdapter {
  /**
   * @inheritdoc
   * Retrieves custom setting class.
   */
  get setting_class() { return Setting; }
  /**
   * @inheritdoc
   * Retrieves the Lucide icon for the given icon name.
   */
  get_icon_html(icon_name) {
    const pascal_case_icon_name = to_pascal_case(icon_name);
    console.log(pascal_case_icon_name);
    return lucide[icon_name] ?? lucide[to_pascal_case(icon_name)];
  }
  /**
   * Check if the given event is a "mod" event, i.e., if a control or meta key is pressed.
   * This serves as a fallback behavior for environments without Obsidian's Keymap.
   * @param {Event} event - The keyboard or mouse event.
   * @returns {boolean} True if the event is considered a "mod" event.
   */
  is_mod_event(event) {
    // On Windows/Linux, Ctrl is often the "mod" key.
    // On macOS, Cmd (metaKey) is the "mod" key.
    // This heuristic checks both.
    return !!(event && (event.ctrlKey || event.metaKey));
  }
  /**
   * Renders the given markdown content.
   * For a Node.js/browser environment without Obsidian's MarkdownRenderer,
   * we provide a simple fallback. If you want proper markdown to HTML conversion,
   * integrate a library like `marked` or `showdown`.
   *
   * @param {string} markdown - The markdown content.
   * @param {object|null} [scope=null] - The scope in which to render the markdown.
   * @returns {Promise<DocumentFragment>} A promise that resolves to a DocumentFragment.
   */
  async render_markdown(markdown, scope=null) {
    // Basic fallback: Just escape the markdown and wrap it in a <pre> for display.
    // Replace this with a proper markdown -> HTML conversion if desired.
    const html = `<pre>${this.main.escape_html(markdown)}</pre>`;
    return this.main.create_doc_fragment(html);
  }
}

export class Setting {
  constructor(element) {
    this.element = element;
    this.container = this.createSettingItemContainer();
    // compatibility with Obsidian
    this.settingEl = this.container;
    this.controlEl = this.container.querySelector('.control');
  }
  safe_inner_html(elm, html){
    safe_inner_html(elm, html);
  }
  empty(elm){
    empty(elm);
  }
  add_text(configurator) {
    const controlContainer = this.container.querySelector('.control');
    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.spellcheck = false;
    controlContainer.appendChild(textInput);
    configurator({
      inputEl: textInput,
      setPlaceholder: (placeholder) => textInput.placeholder = placeholder,
      setValue: (value) => textInput.value = value,
      onChange: (callback) => textInput.addEventListener('change', () => callback(textInput.value)),
      getValue: () => textInput.value
    });
    this.element.appendChild(this.container);
  }
  add_dropdown(configurator) {
    const controlContainer = this.container.querySelector('.control');
    const select = document.createElement('select');
    controlContainer.appendChild(select);
    configurator({
      inputEl: select,
      addOption: (value, name, selected = false) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = name;
        select.appendChild(option);
        if (selected) {
          option.selected = true;
          option.classList.add("selected");
        }
        if (value === "") option.disabled = true;
        return option;
      },
      onChange: (callback) => select.addEventListener('change', () => callback(select.value)),
      setValue: (value) => select.value = value
    });
    this.element.appendChild(this.container);
  }
  add_button(configurator) {
    const controlContainer = this.container.querySelector('.control');
    const button = document.createElement('button');
    controlContainer.appendChild(button);
    configurator({
      inputEl: button,
      setButtonText: (text) => button.textContent = text,
      onClick: (callback) => button.addEventListener('click', callback)
    });
    this.element.appendChild(this.container);
  }
  create_setting_item_container() {
    const container = document.createElement('div');
    container.classList.add('setting-item');
    const infoContainer = document.createElement('div');
    infoContainer.classList.add('info', 'setting-item-info');
    container.appendChild(infoContainer);
    // Placeholders for name and description
    const namePlaceholder = document.createElement('div');
    namePlaceholder.classList.add('name');
    infoContainer.appendChild(namePlaceholder);
    // const tagPlaceholder = document.createElement('div');
    // tagPlaceholder.classList.add('tag');
    // infoContainer.appendChild(tagPlaceholder);
    // const descPlaceholder = document.createElement('div');
    // descPlaceholder.classList.add('description');
    // infoContainer.appendChild(descPlaceholder);
    const controlContainer = document.createElement('div');
    controlContainer.classList.add('control', 'setting-item-control');
    container.appendChild(controlContainer);
    return container;
  }
  add_toggle(configurator) {
    const controlContainer = this.container.querySelector('.control');
    const checkboxContainer = document.createElement('div');
    checkboxContainer.classList.add('checkbox-container');
    controlContainer.appendChild(checkboxContainer);
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.tabIndex = 0;
    checkboxContainer.appendChild(checkbox);
    configurator({
      setValue: (value) => {
        checkbox.checked = value;
        checkbox.value = value;
        checkboxContainer.classList.toggle('is-enabled', value);
      },
      onChange: (callback) => checkbox.addEventListener('change', () => {
        callback(checkbox.checked);
        checkboxContainer.classList.toggle('is-enabled', checkbox.checked);
      })
    });
    this.element.appendChild(this.container);
  }
  add_text_area(configurator) {
    const controlContainer = this.container.querySelector('.control');
    const textarea = document.createElement('textarea');
    textarea.spellcheck = false;
    controlContainer.appendChild(textarea);
    configurator({
      inputEl: textarea,
      setPlaceholder: (placeholder) => textarea.placeholder = placeholder,
      setValue: (value) => textarea.value = value,
      onChange: (callback) => textarea.addEventListener('change', () => callback(textarea.value))
    });
    this.element.appendChild(this.container);
  }
  add_folder_select(configurator) {
    // Get the control container from the setting-item container.
    const container = this.container.querySelector('.control');
    
    // Create a wrapping container for the folder select components.
    const folder_select = document.createElement('div');
    folder_select.classList.add('folder-select');

    // Create a read-only visible input to display the folder path.
    const current_folder = document.createElement('span');
    current_folder.classList.add('current');

    // Create a hidden input to store the folder path for change detection.
    const hidden_input = document.createElement('input');
    hidden_input.type = 'hidden';
    hidden_input.classList.add('hidden-path');

    // Create the browse button for selecting a folder.
    const browse_btn = document.createElement('button');
    browse_btn.textContent = 'Browse';
    browse_btn.classList.add('browse-button');

    // Append the visible input, hidden input, and button to the folder_select container.
    folder_select.appendChild(current_folder);
    folder_select.appendChild(hidden_input);
    folder_select.appendChild(browse_btn);
    
    // Append the folder_select container to the main control container.
    container.appendChild(folder_select);
    
    // Provide configurator with both the hidden and visible elements along with utility functions.
    configurator({
      inputEl: folder_select,       // Hidden input is used for change detection.
      setPlaceholder: (placeholder) => { current_folder.placeholder = placeholder; },
      setValue: (value) => {
        current_folder.innerText = value;
        hidden_input.value = value;
      },
      getValue: () => hidden_input.value
    });
    
    this.element.appendChild(this.container);
  }
  add_file_select(configurator) {
    const container = this.container.querySelector('.control');
    const file_select = document.createElement('div');
    file_select.classList.add('file-select');
    container.appendChild(file_select);
    const current_file = document.createElement('span');
    // current_file.type = 'text';
    current_file.classList.add('current');
    container.appendChild(current_file);
    const browse_btn = document.createElement('button');
    browse_btn.textContent = 'Browse';
    browse_btn.classList.add('browse-button');
    container.appendChild(browse_btn);
    configurator({
      inputEl: current_file,
      setPlaceholder: (placeholder) => current_file.placeholder = placeholder,
      setValue: (value) => current_file.innerText = value,
    });
    this.element.appendChild(this.container);
  }
  add_slider(configurator) {
    const controlContainer = this.container.querySelector('.control');
    // Create a <input type="range"> element
    const rangeInput = document.createElement('input');
    rangeInput.type = 'range';
    rangeInput.tabIndex = 0;
    controlContainer.appendChild(rangeInput);

    // Provide the standard configurator pattern
    configurator({
      inputEl: rangeInput,
      /**
       * Example usage: setLimits(min, max, step)
       */
      setLimits: (min, max, step = 1) => {
        rangeInput.min = min;
        rangeInput.max = max;
        rangeInput.step = step;
      },
      setValue: (value) => {
        rangeInput.value = value;
      },
      onChange: (callback) => {
        // Use 'input' event to capture continuous slider changes
        rangeInput.addEventListener('input', () => {
          callback(rangeInput.value);
        });
      }
    });

    this.element.appendChild(this.container);
  }
  set_name(name) {
    const nameElement = this.container.querySelector('.name');
    if (nameElement) {
      this.safe_inner_html(nameElement, name);
    } else {
      // Create the element if it doesn't exist
      const newNameElement = document.createElement('div');
      newNameElement.classList.add('name');
      this.safe_inner_html(newNameElement, name);
      // this.element.appendChild(newNameElement);
      const info_container = this.container.querySelector('.info');
      info_container.prepend(newNameElement);
    }
  }
  set_desc(description) {
    let desc_element = this.container.querySelector('.description');
    if (!desc_element) {
      // Create the element if it doesn't exist
      desc_element = document.createElement('div');
      desc_element.classList.add('description');
      const info_container = this.container.querySelector('.info');
      info_container.appendChild(desc_element);
    }
    
    // Clear existing content
    this.empty(desc_element);
    
    if (description instanceof DocumentFragment) {
      desc_element.appendChild(description);
    } else {
      this.safe_inner_html(desc_element, description);
    }
  }
  set_tooltip(tooltip) {
    const elm = this.container;
    const control_element = elm.querySelector('.control');
    control_element.setAttribute('title', tooltip);
    elm.setAttribute('title', tooltip);
    const tooltip_container = document.createElement('div');
    tooltip_container.classList.add('tooltip');
    this.safe_inner_html(tooltip_container, tooltip);
    elm.insertAdjacentElement('afterend', tooltip_container);
  }
  // aliases
  addText(configurator) { return this.add_text(configurator); }
  addDropdown(configurator) { return this.add_dropdown(configurator); }
  addButton(configurator) { return this.add_button(configurator); }
  createSettingItemContainer() { return this.create_setting_item_container(); }
  addToggle(configurator) { return this.add_toggle(configurator); }
  addTextArea(configurator) { return this.add_text_area(configurator); }
  addFolderSelect(configurator) { return this.add_folder_select(configurator); }
  addFileSelect(configurator) { return this.add_file_select(configurator); }
  setName(name) { return this.set_name(name); }
  setDesc(description) { return this.set_desc(description); }
  setTooltip(tooltip) { return this.set_tooltip(tooltip); }
}

// convert lower-hyphenated-words to PascalCase

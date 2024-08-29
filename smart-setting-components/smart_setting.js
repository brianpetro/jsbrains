export class SmartSetting {
  constructor(element) {
    this.element = element;
    this.container = this.createSettingItemContainer();
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
      onChange: (callback) => textInput.addEventListener('change', () => callback(textInput.value))
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
    infoContainer.classList.add('info');
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
    controlContainer.classList.add('control');
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
    const container = this.container.querySelector('.control');
    const folder_select = document.createElement('div');
    folder_select.classList.add('folder-select');
    container.appendChild(folder_select);
    const currentFolder = document.createElement('span');
    // currentFolder.type = 'text';
    currentFolder.classList.add('current');
    container.appendChild(currentFolder);
    const browse_btn = document.createElement('button');
    browse_btn.textContent = 'Browse';
    browse_btn.classList.add('browse-button');
    container.appendChild(browse_btn);
    configurator({
      inputEl: currentFolder,
      setPlaceholder: (placeholder) => currentFolder.placeholder = placeholder,
      setValue: (value) => currentFolder.innerText = value,
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
  set_name(name) {
    const nameElement = this.container.querySelector('.name');
    if (nameElement) {
      nameElement.innerHTML = name;
    } else {
      // Create the element if it doesn't exist
      const newNameElement = document.createElement('div');
      newNameElement.classList.add('name');
      newNameElement.innerHTML = name;
      // this.element.appendChild(newNameElement);
      const info_container = this.container.querySelector('.info');
      info_container.prepend(newNameElement);
    }
  }
  set_desc(description) {
    const descElement = this.container.querySelector('.description');
    if (descElement) {
      descElement.innerHTML = description;
    } else {
      // Create the element if it doesn't exist
      const newDescElement = document.createElement('div');
      newDescElement.classList.add('description');
      newDescElement.innerHTML = description;
      // this.element.appendChild(newDescElement);
      const info_container = this.container.querySelector('.info');
      info_container.appendChild(newDescElement);
    }
  }
  set_tooltip(tooltip) {
    const elm = this.container;
    const control_element = elm.querySelector('.control');
    control_element.setAttribute('title', tooltip);
    elm.setAttribute('title', tooltip);
    const tooltip_container = document.createElement('div');
    tooltip_container.classList.add('tooltip');
    tooltip_container.innerHTML = tooltip;
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
}

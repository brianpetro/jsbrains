import { SmartSettings } from "smart-setting";
// Smart Connections Specific Settings
export class SmartChatOptions extends SmartSettings {
  get template() { return this.templates['smart_chat_options']; }
  async get_view_data() {
    const view_data = {
      actions: Object.values(this.env.actions.actions),
      settings: this.plugin.settings,
    };
    return view_data;
  }
  toggled_action(setting) {
    const value = this.get_setting(setting);
    this.env.actions.actions[setting.split('.')[1]].enabled = value;
  }
}
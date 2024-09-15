export class SmartViewAdapter {
  constructor(main) {
    this.main = main;
  }
  add_icon(icon_name) { throw new Error("add_icon() not implemented"); }
  render_setting(setting_config) { throw new Error("render_setting() not implemented"); }
  render_markdown(markdown) { throw new Error("render_markdown() not implemented"); }
}
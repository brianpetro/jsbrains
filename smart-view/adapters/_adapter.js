export class SmartViewAdapter {
  constructor(main) {
    this.main = main;
  }
  add_icon(icon_name) { throw new Error("add_icon() not implemented"); }
  async render_setting_component(setting_elm) { throw new Error("render_setting_component() not implemented"); }
  async render_markdown(markdown, scope=null) { throw new Error("render_markdown() not implemented"); }
}
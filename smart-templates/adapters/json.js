import { FileSourceAdapter } from "smart-sources/adapters/file.js";

/**
 * @class SmartTemplateJsonSourceAdapter
 * @extends SmartTemplateDataAdapter
 * @description for persisting OpenAI chat completion responses to JSON files
 */
export class JsonTemplateSourceAdapter extends FileSourceAdapter {
  static extension = 'json';
  extension = 'json';
  async to_source_file(){
    const file_content = {
      ...this.item.data,
    };
    await this.update(JSON.stringify(file_content, null, 2));
  }
  async from_source_file() {
    const source_file = await this.read();
    const parsed_data = JSON.parse(source_file);
    this.item.data = {
      ...this.item.data,
      ...parsed_data,
      blocks: undefined
    };
    // parsed_data.blocks.forEach(block => {
    //   this.item.env.template_outputs.items[block.key] = new this.item.env.template_outputs.item_type(
    //     this.item.env,
    //     block
    //   );
    // });
  }
}
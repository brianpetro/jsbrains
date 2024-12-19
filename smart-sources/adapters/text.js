import { FileSourceContentAdapter } from "./_file.js";

export class TextSourceContentAdapter extends FileSourceContentAdapter {
}

export default {
  collection: null, // No collection adapter needed for text sources
  item: TextSourceContentAdapter
};
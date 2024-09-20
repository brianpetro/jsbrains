import { SourceAdapter } from "./_adapter.js";

export async function extract_text(env_opts, base64_pdf) {
  const images = await convert_pdf_to_base64_images(env_opts.dependencies, base64_pdf);
  const openai_chat_messages = images.map((image, index) => ({
    role: 'user',
    content: [
      { type: 'image_url', image_url: { url: image } }
    ]
  }));
  openai_chat_messages.push({
    role: 'user',
    content: [
      { type: 'text', text: 'Extract text from the images and format as a well structured markdown document using headings that include the page number.' }
    ]
  });
  const chat_model = new env_opts.chat_model({
    settings: {
      platform_key: 'openai',
      model_key: 'gpt-4-vision-preview',
      api_key: env_opts.settings.openai.api_key,
    }
  });
  const req = {
    messages: openai_chat_messages,
  };
  const response = await chat_model.complete(req);
  return response;
}

export class SmartSourcesPdfAdapter extends SourceAdapter {
  async _read() {
    return await this.smart_source.fs.read(this.smart_source.data.path, 'base64');
  }
  async read() {
    if(!this.data.content) {
      const base64_pdf = await this._read();
      const response = await extract_text(this.smart_source.env.opts, { base64_pdf });
      this.data.response = response;
      // TODO parse
    }

    // Return content from data.content
    return this.data.content;

  }

  update() {
    throw new Error('not available for file type');
  }

  create() {
    throw new Error('not available for file type');
  }
}

class NodeCanvasFactory {
  create(width, height) {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');
    return { canvas, context };
  }

  reset(canvasAndContext, width, height) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  destroy(canvasAndContext) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

async function convert_pdf_to_base64_images(dependencies, pdf_base64) {
  const { PDFDocument } = dependencies.pdf_lib;
  const sharp = dependencies.sharp;

  const pdf_data = Buffer.from(pdf_base64, 'base64');
  const pdf_doc = await PDFDocument.load(pdf_data);
  const base64_images = [];

  for (let i = 0; i < pdf_doc.getPageCount(); i++) {
    const page = pdf_doc.getPage(i);
    const { width, height } = page.getSize();
    
    // Create a new PDFDocument for each page
    const single_page_pdf = await PDFDocument.create();
    const [copied_page] = await single_page_pdf.copyPages(pdf_doc, [i]);
    single_page_pdf.addPage(copied_page);

    // Convert the single-page PDF to PNG
    const png_bytes = await single_page_pdf.saveAsBase64({ dataUri: true });
    const png_data = png_bytes.split(',')[1];

    // Convert PNG to JPEG using sharp
    const jpeg_buffer = await sharp(Buffer.from(png_data, 'base64'))
      .jpeg({ quality: 80 })
      .toBuffer();

    const base64_image = `data:image/jpeg;base64,${jpeg_buffer.toString('base64')}`;
    base64_images.push(base64_image);
    console.log(`Page ${i + 1} converted to Base64 image.`);
  }

  return base64_images;
}
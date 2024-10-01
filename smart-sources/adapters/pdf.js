import { MarkdownSourceAdapter } from "./markdown.js";
export class PdfSourceAdapter extends MarkdownSourceAdapter {
  async _read() {
    return await this.smart_source.fs.read(this.smart_source.data.path, null);
  }
  async read() {
    if(!this.data.content) {
      const pdf_data = await this._read();
      const response = await extract_text(this.smart_source.env.opts, pdf_data);
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

async function render_page_to_image(page, page_number, create_canvas) {
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = create_canvas(viewport.width, viewport.height);
  const context = canvas.getContext('2d');
  const render_context = {
    canvasContext: context,
    viewport: viewport,
  };

  await page.render(render_context).promise;
  const buffer = canvas.toBuffer('image/png');
  return buffer;
}

async function pdf_to_images(pdf_data, pdfjsLib, create_canvas) {
  try {
    const pdf_doc = await pdfjsLib.getDocument({ data: pdf_data }).promise;
    const total_pages = pdf_doc.numPages;
    const images = [];

    for (let i = 1; i <= total_pages; i++) {
      const page = await pdf_doc.getPage(i);
      const image_buffer = await render_page_to_image(page, i, create_canvas);
      images.push(image_buffer);
    }

    return images;
  } catch (error) {
    console.error(`Error processing PDF: ${error.message}`);
    throw error;
  }
}

export async function extract_text(env_opts, base64_pdf) {
  const pdf_data = Buffer.from(base64_pdf, 'base64');
  const images = await pdf_to_images(pdf_data, env_opts.dependencies.pdfjsLib, env_opts.dependencies.createCanvas);
  const openai_chat_messages = images.map((image, index) => ({
    role: 'user',
    content: [
      { 
        type: 'image_url',
        image_url: { 
          url: `data:image/png;base64,${image.toString('base64')}`, 
          detail: 'low' 
        } 
      },
      {
        type: 'text',
        text: `this is page ${index + 1}.`
      }
    ]



  }));

  openai_chat_messages.unshift({
    role: 'system',
    content: [
      { type: 'text', text: 'You are an AI assistant that can extract text from images of pages. You will be given an image of a page and you need to extract the text from the image. You will need to format the text as a well structured markdown document using headings to best emulate the original document. Headings should include the page number where they are found, e.g. "## first heading (page 2)". Not all pages will have headings, but you should use headings where they are present.' }
    ]
  });

  openai_chat_messages.push({

    role: 'user',
    content: [
      { type: 'text', text: 'Extract text from the images and format as a well structured markdown document using headings that include the page number.' }
    ]
  });
  const chat_model = new env_opts.modules.smart_chat_model.class({
    settings: {
      platform_key: 'openai',
      openai: {
        model_key: 'gpt-4o-mini',
      },
    },

    api_key: env_opts.settings.openai.api_key,
    adapters: env_opts.modules.smart_chat_model.adapters,
  });
  const req = {
    messages: openai_chat_messages,
  };
  // console.log('req', req);
  const response = await chat_model.complete(req);
  // console.log('response', response);
  return response.choices[0].message.content;
}


// Remove the convert_pdf_to_base64_images function as it's no longer needed

/**
 * @deprecated see ContextCompletionAdapter
 */
export async function insert_pdf(request, pdf_path, fs) {
  const base64_pdf = await convert_pdf_to_base64(fs, pdf_path);
  if(!base64_pdf) return;
  const last_user_index = request.messages.findLastIndex(x => x.role === 'user');
  const pdf_content = {
    role: 'user',
    content: [{
      type: 'file',
      file: {
        filename: pdf_path.split(/[\\/]/).pop(),
        file_data: `data:application/pdf;base64,${base64_pdf}` // <-- Prefix added
      }
    }]
  };
  if(last_user_index === -1) {
    request.messages.unshift(pdf_content);
    return;
  }
  const last_user_message = request.messages[last_user_index];
  if(!last_user_message) return console.warn('insert_pdf: no last_user_message');
  if(!Array.isArray(last_user_message.content)) {
    last_user_message.content = [];
  }
  last_user_message.content.push(pdf_content.content[0]);
}

async function convert_pdf_to_base64(fs, pdf_path) {
  if (!pdf_path) return;
  const ext = pdf_path.split('.').pop().toLowerCase();
  if (ext !== 'pdf') return;
  try {
    // read file as base64 from smart_sources fs
    const base64_data = await fs.read(pdf_path, 'base64');
    return base64_data;
  } catch (err) {
    console.warn(`Failed to convert PDF ${pdf_path} to base64`, err);
  }
}
/**
 * @deprecated see ContextCompletionAdapter
 */
export async function insert_image(request, image_path, fs) {
  const base64_image = await convert_image_to_base64(fs, image_path);
  if(!base64_image) return;
  const last_user_index = request.messages.findLastIndex(x => x.role === 'user');
  const image_content = {
    role: 'user',
    content: [{ type: 'image_url', image_url: { url: base64_image } }]
  };
  if(last_user_index === -1) {
    request.messages.unshift(image_content);
  }
  const last_user_message = request.messages[last_user_index];
  if(!last_user_message) return console.warn('insert_image: no last_user_message');
  if(!Array.isArray(last_user_message.content)) {
    last_user_message.content = [];
  }
  last_user_message.content.push(image_content.content[0]);
}
async function convert_image_to_base64(fs, image_path) {
  if (!image_path) return;
  const image_exts = ['png','jpg','jpeg','gif','webp','svg','bmp','ico'];
  const ext = image_path.split('.').pop().toLowerCase();
  if (!image_exts.includes(ext)) return;
  try {
    // read file as base64 from smart_sources fs
    const base64_data = await fs.read(image_path, 'base64');
    const base64_url = `data:image/${ext};base64,${base64_data}`;
    return base64_url;
  } catch (err) {
    console.warn(`Failed to convert image ${image_path} to base64`, err);
  }
}
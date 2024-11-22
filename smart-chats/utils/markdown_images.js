// New file for markdown image utilities

/**
 * Checks if content contains markdown image syntax
 * @param {string} content - Content to check
 * @returns {boolean} True if content contains markdown images
 */
export function contains_markdown_image(content) {
  if (!content || typeof content !== 'string') return false;
  return /!\[([^\]]*)]\(([^)]+)\)/g.test(content);
}

/**
 * Extracts markdown images from content
 * @param {string} content - Content to parse
 * @returns {Array<Object>} Array of image objects containing full_match, caption, and img_path
 */
export function extract_markdown_images(content) {
  const regex = /!\[(?<caption>[^\]]*)\]\((?<img_path>[^\)]+)\)/g;
  const images = [];
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    images.push({
      full_match: match[0],
      caption: match.groups.caption,
      img_path: match.groups.img_path
    });
  }
  
  return images;
} 
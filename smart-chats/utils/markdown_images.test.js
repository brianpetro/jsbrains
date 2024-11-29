import { contains_markdown_image, extract_markdown_images } from "./markdown_images.js";
import test from "ava";

test('contains_markdown_image', t => {
  t.is(contains_markdown_image('![test](test.png)'), true, 'should handle with caption');
  t.is(contains_markdown_image('![](test.png)'), true, 'should handle without caption');
  t.is(contains_markdown_image('![](test with spaces.png)'), true, 'should handle spaces in file name');
});
test('extract_markdown_images', t => {
  const images = extract_markdown_images('![test](test.png)');
  t.deepEqual(images, [{
    full_match: '![test](test.png)',
    image_path: 'test.png',
    caption: 'test',
  }]);
});
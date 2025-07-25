import test from 'ava';
import { camel_case_to_snake_case } from './camel_case_to_snake_case.js';

test('camel_case_to_snake_case converts classes', t => {
  t.is(camel_case_to_snake_case('CamelCase'), 'camel_case');
  t.is(camel_case_to_snake_case('MyClass2'), 'my_class');
});

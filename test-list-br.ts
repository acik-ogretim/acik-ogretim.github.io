
import { cleanHtml } from './scripts/utils/clean-html.ts';

console.log("--- Testing List-BR Cleanup ---");
const listInput = '<ul><br><li>Item 1</li><br><li>Item 2</li><br></ul><br><ol><br><li>Item A</li></ol>';
const listOutput = cleanHtml(listInput);
console.log(`Input: ${listInput}`);
console.log(`Output: '${listOutput}'`);

const listInput2 = 'Text<br><ul><li>Item</li></ul><br>Text';
console.log(`Input2: ${listInput2}`);
console.log(`Output2: '${cleanHtml(listInput2)}'`);

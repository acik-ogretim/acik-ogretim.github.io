
import { cleanHtml } from './scripts/utils/clean-html.ts';

console.log("--- Testing Hyphenation Fix ---");
const hyphenInput = 'sis- </span> <span style="font-size:12px">temi';
const hyphenOutput = cleanHtml(hyphenInput);
console.log(`Input: ${hyphenInput}`);
console.log(`Output: '${hyphenOutput}'`);

console.log("\n--- Testing Code Span Conversion ---");
const codeInput = '<span style="font-family: courier new">print("hello")</span>';
const codeOutput = cleanHtml(codeInput);
console.log(`Input: ${codeInput}`);
console.log(`Output: '${codeOutput}'`);

console.log("\n--- Testing Pre/Span Preservation ---");
const preInput = '<pre><span lang="en">var x = 1;</span></pre>';
const preOutput = cleanHtml(preInput);
console.log(`Input: ${preInput}`);
console.log(`Output: '${preOutput}'`);

console.log("\n--- Testing BR Handling ---");
const brInput = 'Line 1<br>Line 2\nLine 3';
const brOutput = cleanHtml(brInput);
console.log(`Input: ${brInput.replace(/\n/g, '\\n')}`);
console.log(`Output: '${brOutput.replace(/\n/g, '\\n')}'`);

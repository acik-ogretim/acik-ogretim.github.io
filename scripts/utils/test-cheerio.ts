
import { cleanHtml } from './clean-html';

const inputs = [
    '<ul><li>Unclosed List Item</li><li>ikinci liste',
    '<p><strong>Unclosed Strong',
    '<div><span>Unclosed Span inside Div',
    'Just text with <br> unclosed'
];

console.log('--- CHEERIO IMPLEMENTATION TESTS ---');
inputs.forEach(input => {
    console.log(`\nInput: "${input}"`);
    // Tests the actual cleanHtml function which now uses Cheerio
    const cleaned = cleanHtml(input, { isTechnical: false });
    console.log(`Output: "${cleaned}"`);
});

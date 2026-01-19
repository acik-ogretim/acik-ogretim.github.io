
import { cleanHtml } from './clean-html';

const brokenTitle = '<p>Liste Başlığı:</p><ul><li>Birinci madde (başlıkta)</li><li>İkinci madde başı...';
const brokenExpl = '...ikinci madde sonu (açıklamada)</li><li>Üçüncü madde</li></ul>';

console.log('--- RAW INPUTS ---');
console.log('Title Raw:', brokenTitle);
console.log('Expl Raw:', brokenExpl);

console.log('\n--- STRATEGY 1: CLEAN INDIVIDUALLY THEN MERGE (Current) ---');
const cTitle = cleanHtml(brokenTitle);
const cExpl = cleanHtml(brokenExpl);
console.log('Cleaned Title:', cTitle);
console.log('Cleaned Expl:', cExpl);
console.log('Merged Result:', `${cTitle} ${cExpl}`);

console.log('\n--- STRATEGY 2: CONCATENATE RAW THEN CLEAN ---');
const rawConcat = brokenTitle + " " + brokenExpl;
console.log('Merged Result:', cleanHtml(rawConcat));

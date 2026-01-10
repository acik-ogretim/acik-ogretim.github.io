import he from 'he';
const text = "A&nbsp;B";
const decoded = he.decode(text);
console.log('Decoded:', JSON.stringify(decoded));
console.log('Hex:', decoded.charCodeAt(1).toString(16));
const cleaned = decoded.replace(/\u00A0/g, " ");
console.log('Cleaned:', JSON.stringify(cleaned));
console.log('Final Hex:', cleaned.charCodeAt(1).toString(16));

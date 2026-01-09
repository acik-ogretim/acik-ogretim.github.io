
import dotenv from 'dotenv';
import https from 'https';
import path from 'path';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from sibling project
dotenv.config({ path: path.resolve(__dirname, '../../acik-ogretim-mcp/.env') });

const token = process.env.ANADOLU_AUTH_TOKEN;

if (!token) {
    console.error("❌ Token not found in env!");
    process.exit(1);
} else {
    console.log("✅ Token found (starts with):", token.substring(0, 10) + "...");
}

// Course in token: GIT203U (Tipografi)
// Using 20 limit as requested
const options = {
    hostname: 'ets-ws.anadolu.edu.tr',
    path: `/v2filikaapi/examservice/create/20/${encodeURIComponent('GİT203U')}/1`,
    method: 'GET',
    headers: {
        'Accept': '*/*',
        'Authorization': token,
        'User-Agent': 'Mozilla/5.0'
    }
};

console.log(`Testing URL: ${options.path}`);

const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let data = '';
    res.on('data', (d) => data += d);
    res.on('end', () => {
        console.log('BODY:', data.substring(0, 500));
    });
});

req.on('error', (e) => {
    console.error(e);
});
req.end();

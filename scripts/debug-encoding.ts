
import dotenv from 'dotenv';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../acik-ogretim-mcp/.env') });

const token = process.env.ANADOLU_AUTH_TOKEN;

const options = {
    hostname: 'ets-ws.anadolu.edu.tr',
    path: `/v2filikaapi/examservice/create/20/${encodeURIComponent('SOS104U')}/1`,
    method: 'GET',
    headers: {
        'Accept': '*/*',
        'Authorization': token,
        'User-Agent': 'Mozilla/5.0'
    }
};

const req = https.request(options, (res) => {
    // Note: NOT using setEncoding here to see raw bytes
    let chunks: Buffer[] = [];
    res.on('data', (d: Buffer) => chunks.push(d));
    res.on('end', () => {
        let buffer = Buffer.concat(chunks);
        let text = buffer.toString('utf8');
        console.log(text.substring(0, 2000));

        if (text.includes('\uFFFD')) {
            console.log("❌ FOUND REPLACEMENT CHARACTER IN BUFFER.toString('utf8')");
        } else {
            console.log("✅ NO REPLACEMENT CHARACTER FOUND");
        }
    });
});

req.on('error', (e) => console.error(e));
req.end();

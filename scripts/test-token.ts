
import https from 'https';

const token = process.env.ANADOLU_AUTH_TOKEN;

if (!token) {
    console.error("Token not found in env");
    process.exit(1);
}

// Course in token: GIT203U (Tipografi)
const options = {
    hostname: 'ets-ws.anadolu.edu.tr',
    path: '/v2filikaapi/examservice/create/20/GİT203U/1', // Turkish chars? Try raw GIT203U
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

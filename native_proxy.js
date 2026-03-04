const http = require('http');

const server = http.createServer((req, res) => {
    const options = {
        hostname: '127.0.0.1',
        port: 5000,
        path: req.url,
        method: req.method,
        headers: req.headers
    };

    const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
    });

    req.pipe(proxyReq, { end: true });

    proxyReq.on('error', (e) => {
        console.error(`Problem with request: ${e.message}`);
        res.writeHead(500);
        res.end('Proxy error');
    });
});

server.listen(8082, '0.0.0.0', () => {
    console.log('Native proxy running on 0.0.0.0:8082 -> 127.0.0.1:5000');
});

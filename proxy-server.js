const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 9000;

app.use(cors());
app.use(express.json());

// Proxy all requests to the main server
app.use('/', createProxyMiddleware({
  target: 'http://localhost:8080',
  changeOrigin: true,
  logLevel: 'debug'
}));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Proxy server running on port ${PORT}`);
  console.log(`Proxy accessible at http://192.168.1.180:${PORT}`);
}); 
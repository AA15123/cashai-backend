const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Test server is working!' });
});

app.post('/api/create-link-token', (req, res) => {
  res.json({ 
    link_token: 'test-link-token-123',
    message: 'Test link token created!' 
  });
});

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
}); 
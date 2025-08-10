const express = require('express');
const cors = require('cors');
const plaid = require('plaid');
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');
const exphbs = require('express-handlebars');
const session = require('express-session');
const config = require('./config');
require('dotenv').config();
const db = require('./database'); // Import the database module
const { generateToken, verifyToken } = require('./config/auth');

const app = express();
const PORT = process.env.PORT || 8080;

// Setup Handlebars for dashboard
app.engine('handlebars', exphbs.engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

// Middleware
app.use(cors());
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true in production with HTTPS
}));
// Passport middleware removed for basic Plaid integration

// Plaid configuration
const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});


const plaidClient = new PlaidApi(configuration);

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'CashAI Backend is running!' });
});

// Test route to check if database is working
app.get('/api/users', (req, res) => {
  res.json({
    message: 'Database is connected!',
    data: []
  });
});

// Create link token for Plaid Link
app.post('/api/create-link-token', async (req, res) => {
  try {
    const request = {
      user: { client_user_id: 'user-id' },
      client_name: 'CashAI',
      products: ['auth', 'transactions'],    // ✅ Now using both auth AND transactions!
      country_codes: ['US'],
      language: 'en',
      // redirect_uri: 'https://cashai.app/plaid-oauth-callback' // Uncomment when you have a public HTTPS domain
    };

    const createTokenResponse = await plaidClient.linkTokenCreate(request);
    res.json(createTokenResponse.data);
  } catch (error) {
    console.error('Error creating link token:', error.response ? error.response.data : error.message);
    res.status(500).send('Failed to create link token');
  }
});

// Exchange public token for access token
app.post('/api/exchange-public-token', async (req, res) => {
  try {
    const { public_token, user_id = 'user-id' } = req.body;
    const exchange = await plaidClient.itemPublicTokenExchange({ public_token });
    const accessToken = exchange.data.access_token;
    
    // Store access token in database (for now, just return success)
    console.log('✅ Exchanged public token for access token:', accessToken.substring(0, 20) + '...');
    
    res.json({ 
      success: true, 
      item_id: exchange.data.item_id,
      access_token: accessToken // In production, don't return this - store it securely
    });
  } catch (error) {
    console.error('Error exchanging token:', error.response ? error.response.data : error.message);
    res.status(500).send('Failed to exchange public token');
  }
});

// Plaid OAuth redirect handler
app.get('/plaid-oauth-callback', (req, res) => {
  const { oauth_state_id, error } = req.query;
  
  if (error) {
    // Handle OAuth error
    res.redirect('cashai://plaid-oauth-callback?error=' + encodeURIComponent(error));
  } else {
    // Success - redirect to iOS app
    res.redirect('cashai://plaid-oauth-callback?oauth_state_id=' + oauth_state_id);
  }
});

// Get transactions
app.get('/api/transactions', async (req, res) => {
  // In a real app, you would retrieve the access_token for the current user from your database
  const accessToken = 'YOUR_SAVED_ACCESS_TOKEN'; // Replace with a real access token from your DB

  if (!accessToken || accessToken === 'YOUR_SAVED_ACCESS_TOKEN') {
    return res.status(400).json({ error: 'Access token not found. Please connect a bank account first.' });
  }

  try {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.setDate(today.getDate() - 30));
    const startDate = thirtyDaysAgo.toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];

    const request = {
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
      options: {
        count: 250,
        offset: 0,
      },
    };

    const response = await plaidClient.transactionsGet(request);
    res.json(response.data);
  } catch (error) {
    console.error('Error getting transactions:', error.response ? error.response.data : error.message);
    res.status(500).send('Failed to retrieve transactions');
  }
});

// Start the server
// Dashboard route
app.get('/dashboard', async (req, res) => {
  try {
    // Get data from database
    const users = await db.getUsers();
    const bankAccounts = await db.getBankAccounts();
    const transactions = await db.getTransactions();
    
    // Calculate stats
    const totalUsers = users.length;
    const totalBankAccounts = bankAccounts.length;
    const totalTransactions = transactions.length;
    const activeUsers = users.filter(user => {
      const userDate = new Date(user.created_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return userDate > weekAgo;
    }).length;
    
    res.render('dashboard', {
      users: users.slice(0, 10), // Show last 10 users
      bankAccounts: bankAccounts.slice(0, 10), // Show last 10 bank accounts
      transactions: transactions.slice(0, 10), // Show last 10 transactions
      totalUsers,
      totalBankAccounts,
      totalTransactions,
      activeUsers
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send('Dashboard error');
  }
});

// Authentication routes removed for basic Plaid integration
// These will be added back later when implementing full authentication

// Verify token endpoint
app.post('/api/verify-token', (req, res) => {
    const { token } = req.body;
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.json({ valid: true, user: decoded });
});

app.listen(config.port, config.host, () => {
  console.log(`Server running on port ${config.port}`);
  console.log(`Server accessible at ${config.getServerURL()}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
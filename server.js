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

// Handlebars setup
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
    cookie: { secure: false }
}));

// Passport middleware removed for basic Plaid integration

// Plaid configuration
const configuration = new Configuration({
                basePath: process.env.PLAID_ENV === 'production' ? PlaidEnvironments.production : PlaidEnvironments.sandbox,
    baseOptions: {
        headers: {
            'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
            'PLAID-SECRET': process.env.PLAID_SECRET,
        }
    }
});

const plaidClient = new PlaidApi(configuration);

// Routes
app.get('/', (req, res) => {
    res.json({ message: 'CashAI Backend is running!' });
});

app.get('/api/users', async (req, res) => {
    try {
        const users = await db.getUsers();
        res.json({ message: 'Database is connected!', data: users });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Create Link Token endpoint
app.post('/api/create-link-token', async (req, res) => {
    try {
        const products = ['auth']; // Test with auth only first
        
        const request = {
            user: {
                client_user_id: 'user-id'
            },
            client_name: 'CashAI',
            products: products,
            country_codes: ['US'],
            language: 'en',
            redirect_uri: 'https://cashai-backend.onrender.com/plaid-oauth-callback'
        };

        console.log('🔍 Request being sent to Plaid:', JSON.stringify(request, null, 2));
        console.log('🔍 Environment:', process.env.PLAID_ENV);
        console.log('🔍 Products:', products);

        const response = await plaidClient.linkTokenCreate(request);
        res.json({ link_token: response.data.link_token });
    } catch (error) {
        console.error('Error creating link token:', error.message);
        console.error('Plaid error message:', error.response?.data?.error_message || 'No specific error message');
        console.error('Plaid error code:', error.response?.data?.error_code || 'No error code');
        console.error('Full Plaid response:', JSON.stringify(error.response?.data, null, 2));
        res.status(500).json({ 
            error: 'Failed to create link token',
            details: error.message 
        });
    }
});

// Test endpoint for Sandbox
app.post('/api/test-sandbox', async (req, res) => {
    try {
        // Temporarily switch to sandbox
        const sandboxClient = new PlaidApi(
            new Configuration({
                basePath: PlaidEnvironments.sandbox,
                apiKey: {
                    clientId: process.env.PLAID_CLIENT_ID,
                    secret: process.env.PLAID_SECRET,
                },
            })
        );
        
        const request = {
            client_user_id: 'user-id',
            client_name: 'CashAI',
            products: ['auth'],
            country_codes: ['US'],
            language: 'en'
        };
        
        const response = await sandboxClient.linkTokenCreate(request);
        res.json({ 
            success: true, 
            link_token: response.data.link_token,
            message: 'Sandbox test successful'
        });
    } catch (error) {
        console.error('Sandbox test error:', error.message);
        res.status(500).json({ 
            error: 'Sandbox test failed',
            details: error.message 
        });
    }
});

// Exchange Public Token endpoint
app.post('/api/exchange-public-token', async (req, res) => {
    try {
        const { public_token } = req.body;
        
        if (!public_token) {
            return res.status(400).json({ error: 'public_token is required' });
        }

        const response = await plaidClient.itemPublicTokenExchange({ public_token });
        console.log('✅ Exchange successful, access token:', response.data.access_token ? 'present' : 'missing');
        
        res.json({ 
            access_token: response.data.access_token,
            item_id: response.data.item_id 
        });
    } catch (error) {
        console.error('❌ Exchange error:', error.message);
        res.status(500).json({ error: 'Failed to exchange public token' });
    }
});

// Get Balances endpoint
app.post('/api/balances', async (req, res) => {
    try {
        const { access_token } = req.body;
        
        if (!access_token) {
            return res.status(400).json({ error: 'access_token is required' });
        }

        console.log('💰 Fetching balances for access token:', access_token ? 'present' : 'missing');
        
        const response = await plaidClient.accountsBalanceGet({ access_token });
        console.log('✅ Balances fetched successfully');
        
        res.json(response.data);
    } catch (error) {
        console.error('❌ Balances error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// Get Transactions endpoint
app.post('/api/transactions', async (req, res) => {
    try {
        const { access_token } = req.body;
        
        if (!access_token) {
            return res.status(400).json({ error: 'access_token is required' });
        }

        console.log('💳 Fetching transactions for access token:', access_token ? 'present' : 'missing');
        
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        
        const request = {
            access_token: access_token,
            start_date: start.toISOString().split('T')[0],
            end_date: end.toISOString().split('T')[0],
            options: {
                count: 100,
                offset: 0
            }
        };

        const response = await plaidClient.transactionsGet(request);
        console.log('✅ Transactions fetched successfully');
        
        res.json(response.data);
    } catch (error) {
        console.error('❌ Transactions error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// Plaid OAuth redirect handler
app.get('/plaid-oauth-callback', (req, res) => {
    const { oauth_state_id, error } = req.query;
    
    if (error) {
        console.error('❌ OAuth error:', error);
        res.json({ error: error });
    } else {
        console.log('✅ OAuth successful, state:', oauth_state_id);
        res.json({ success: true, oauth_state_id });
    }
});

// Dashboard endpoint
app.get('/dashboard', async (req, res) => {
    try {
        const users = await db.getUsers();
        const bankAccounts = await db.getBankAccounts();
        const transactions = await db.getTransactions();
        
        const totalUsers = users.length;
        const totalBankAccounts = bankAccounts.length;
        const totalTransactions = transactions.length;
        
        // Calculate active users (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const activeUsers = users.filter(user => new Date(user.created_at) > sevenDaysAgo).length;
        
        res.render('dashboard', {
            users: users.slice(0, 10), // Show first 10 users
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
        return res.status(401).json({ error: 'Token is required' });
    }
    
    try {
        const decoded = verifyToken(token);
        res.json({ valid: true, user: decoded });
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Start server
app.listen(config.port || PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${config.port || PORT}`);
    console.log(`🌐 Server accessible at http://localhost:${config.port || PORT}`);
    console.log(`🔧 Environment: ${process.env.PLAID_ENV || 'development'}`);
});// Force redeploy

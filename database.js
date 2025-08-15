const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database file path
const dbPath = path.join(__dirname, 'cashai.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
        createTables();
    }
});

// Create tables
function createTables() {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        name TEXT,
                    login_method TEXT DEFAULT 'email',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Bank accounts table
    db.run(`CREATE TABLE IF NOT EXISTS bank_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        plaid_item_id TEXT,
        plaid_access_token TEXT,
        account_name TEXT,
        account_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // Transactions table
    db.run(`CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        account_id INTEGER,
        plaid_transaction_id TEXT,
        amount REAL,
        category TEXT,
        merchant TEXT,
        date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (account_id) REFERENCES bank_accounts (id)
    )`);

    console.log('Database tables created successfully');
}

// User functions
function createUser(email, name) {
    return new Promise((resolve, reject) => {
        db.run('INSERT INTO users (email, name) VALUES (?, ?)', [email, name], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.lastID);
            }
        });
    });
}

function getUserByEmail(email) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

// Bank account functions
function saveBankAccount(userId, plaidItemId, plaidAccessToken, accountName, accountType) {
    return new Promise((resolve, reject) => {
        db.run('INSERT INTO bank_accounts (user_id, plaid_item_id, plaid_access_token, account_name, account_type) VALUES (?, ?, ?, ?, ?)',
            [userId, plaidItemId, plaidAccessToken, accountName, accountType], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.lastID);
            }
        });
    });
}

function getBankAccounts(userId) {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM bank_accounts WHERE user_id = ?', [userId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// Transaction functions
function saveTransaction(userId, accountId, plaidTransactionId, amount, category, merchant, date) {
    return new Promise((resolve, reject) => {
        db.run('INSERT INTO transactions (user_id, account_id, plaid_transaction_id, amount, category, merchant, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, accountId, plaidTransactionId, amount, category, merchant, date], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.lastID);
            }
        });
    });
}

function getTransactions(userId, limit = 100) {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC LIMIT ?', [userId, limit], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// Dashboard functions
function getUsers() {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM users ORDER BY created_at DESC', (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

function getBankAccounts() {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM bank_accounts ORDER BY created_at DESC', (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

function getTransactions() {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM transactions ORDER BY date DESC', (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// New functions for authentication
function getUserById(id) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

function updateUserLoginMethod(userId, loginMethod) {
    return new Promise((resolve, reject) => {
        db.run('UPDATE users SET login_method = ? WHERE id = ?', [loginMethod, userId], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.changes);
            }
        });
    });
}

module.exports = {
    db,
    createUser,
    getUserByEmail,
    getUserById,
    updateUserLoginMethod,
    saveBankAccount,
    getBankAccounts,
    saveTransaction,
    getTransactions,
    getUsers,
    getTransactions: getTransactions
};
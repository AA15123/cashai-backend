// Configuration file for CashAI Backend
// Update this file when you change locations/networks

const config = {
    // Development settings
    development: {
        host: '0.0.0.0',
        port: 8080,
        allowedOrigins: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://192.168.1.37:8080']
    },
    
    // Production settings (when deployed)
    production: {
        host: '0.0.0.0',
        port: process.env.PORT || 8080,
        allowedOrigins: ['https://your-app-domain.com']
    }
};

// Get current environment
const environment = process.env.NODE_ENV || 'development';
const currentConfig = config[environment];

module.exports = {
    host: currentConfig.host,
    port: currentConfig.port,
    allowedOrigins: currentConfig.allowedOrigins,
    
    // Helper function to get full URL
    getServerURL: () => {
        if (environment === 'production') {
            return `https://your-app-domain.com`;
        }
        return `http://${currentConfig.host}:${currentConfig.port}`;
    }
}; 
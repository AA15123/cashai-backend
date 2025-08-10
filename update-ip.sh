#!/bin/bash

# CashAI Backend IP Update Script
# Run this script when you change networks to automatically update your IP

echo "🌐 CashAI Backend IP Update Script"
echo "=================================="

# Get current IP address
CURRENT_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)

if [ -z "$CURRENT_IP" ]; then
    echo "❌ Could not detect IP address"
    echo "Please manually update the config.js file"
    exit 1
fi

echo "📱 Detected IP: $CURRENT_IP"
echo "🔧 Updating config.js..."

# Update the config file with the new IP
sed -i '' "s/host: 'localhost'/host: '$CURRENT_IP'/" config.js

echo "✅ Updated config.js with IP: $CURRENT_IP"
echo ""
echo "🚀 To start the server:"
echo "   cd ~/Downloads/CashAI/backend"
echo "   node server.js"
echo ""
echo "📱 Your iOS app will automatically detect this IP!" 
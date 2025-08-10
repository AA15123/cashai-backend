# CashAI Backend

Backend server for CashAI iOS app with Plaid integration.

## Deployment to Render

1. **Sign up for Render** at [render.com](https://render.com)
2. **Connect your GitHub repository** (or create one and push this code)
3. **Create a new Web Service**
4. **Configure environment variables** in Render dashboard:
   - `PLAID_CLIENT_ID` - Your Plaid Client ID
   - `PLAID_SECRET` - Your Plaid Secret
   - `PLAID_ENV` - `production`
   - `JWT_SECRET` - Your JWT secret
   - `SESSION_SECRET` - Your session secret
   - `GOOGLE_CLIENT_ID` - Your Google OAuth Client ID
   - `GOOGLE_CLIENT_SECRET` - Your Google OAuth Client Secret

## Local Development

```bash
npm install
npm start
```

Server will run on `http://localhost:8080`

## API Endpoints

- `POST /api/create-link-token` - Create Plaid Link token
- `POST /api/exchange-public-token` - Exchange public token for access token
- `GET /api/transactions` - Get transactions (requires access token) 
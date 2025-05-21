# Deploying to xelo.tools Domain

This document outlines the steps and configuration changes made to deploy the application to the xelo.tools domain.

## Configuration Changes

### Backend Configuration

1. Updated `.env` file with production settings:
   - Set `NODE_ENV=production`
   - Set `FRONTEND_URL=https://xelo.tools`
   - Set `BACKEND_URL=https://xelo.tools/api`

2. CORS Configuration
   - The server is configured to accept connections from the xelo.tools domain
   - CORS settings use the FRONTEND_URL environment variable which has been updated

### Frontend Configuration

1. Created `.env.production` with:
   - `REACT_APP_API_URL=https://xelo.tools/api`

2. Updated API Configuration
   - Modified `src/utils/api.js` to use environment variables with fallback
   - Ensures proper API URL construction in both development and production

3. Updated Proxy Configuration
   - Modified `src/setupProxy.js` to support both development and production environments
   - This only affects development; in production, the app will directly access the same domain

## Deployment Process

1. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```

2. Deploy the backend and frontend to your hosting provider:
   - Ensure the server runs at the root domain: `https://xelo.tools`
   - The API should be accessible at: `https://xelo.tools/api`

3. Set up the domain and DNS:
   - Configure DNS records for xelo.tools to point to your hosting server
   - Set up SSL certificate for secure HTTPS connections

4. Verify deployment:
   - Ensure the React app loads correctly at https://xelo.tools
   - Verify API calls work properly (login, data fetching, etc.)
   - Check that uploads and static files are being served correctly

## Architecture

The deployed application has the following structure:

- **Frontend**: Served from the root URL (https://xelo.tools)
- **Backend API**: Available at /api path (https://xelo.tools/api)
- **Uploads**: Available at /uploads path (https://xelo.tools/uploads)
- **Public Assets**: Available at /public path (https://xelo.tools/public)

This configuration uses a single domain for both frontend and backend, simplifying deployment and avoiding CORS issues.
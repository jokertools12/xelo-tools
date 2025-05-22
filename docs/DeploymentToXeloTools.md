# Deploying to xelo.tools Domain

This document outlines the steps and configuration changes made to deploy the application to the xelo.tools domain.

## Configuration Changes

### Backend Configuration

1. Updated `.env` file with production settings:
   - Set `NODE_ENV=production`
   - Set `FRONTEND_URL=https://xelo.tools`
   - Set `BACKEND_URL=https://api.xelo.tools`

2. CORS Configuration
   - The server is configured to accept connections from the xelo.tools domain
   - CORS settings use the FRONTEND_URL environment variable which has been updated

### Frontend Configuration

1. Created `.env.production` with:
   - `REACT_APP_API_URL=https://api.xelo.tools`

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
   - The frontend should run at: `https://xelo.tools`
   - The backend API should be accessible at: `https://api.xelo.tools`

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
- **Backend API**: Available at a separate domain (https://api.xelo.tools)
- **Uploads**: Available at the backend domain (https://api.xelo.tools/uploads)
- **Public Assets**: Available at the backend domain (https://api.xelo.tools/public)

This configuration uses separate domains for frontend and backend, providing better domain organization and scalability while requiring proper CORS configuration.
# Flash Express Railway Deployment Guide

## 🚀 Deployment Status

✅ **Latest Deployment Successful** - PostgreSQL compatibility fixes deployed!

## 📋 Latest Update

✅ **Build Deployed** - Commit `79db78a` with PostgreSQL JSON query fixes
- **Build ID**: ce0b0742-c25f-4c93-9809-a257b0201715
- **Build Logs**: https://railway.com/project/4a13f477-87b2-4d0f-b2ac-2d35107882fd/service/43f4592a-78c3-43cd-b136-9486d84dfdbd?id=ce0b0742-c25f-4c93-9809-a257b0201715&

## 🔧 Issues Fixed

### PostgreSQL JSON Query Compatibility
- **Issue**: `operator does not exist: json ~~ unknown` error  
- **Root Cause**: SQLite syntax incompatible with PostgreSQL
- **Solution Applied**: 
  ```sql
  -- Before (SQLite): 
  roles LIKE '%"Client"%'
  
  -- After (PostgreSQL):
  roles::jsonb ? 'Client'
  ```
- **Status**: ✅ Fixed and deployed

## 📊 Deployment Summary

- **Project Name**: flash-express
- **Environment**: production  
- **Service**: flash-express-app
- **Build Status**: ✅ Redeployed with fixes
- **Railway Project ID**: 4a13f477-87b2-4d0f-b2ac-2d35107882fd

## 🔧 Configuration

### Current Environment Variables Set:
- `NODE_ENV=production` ✅

### Required Environment Variables (if not set yet):

#### Email Configuration (Required for notifications):
```bash
railway variables --set "EMAIL_USER=your-email@domain.com"
railway variables --set "EMAIL_PASS=your-email-password"
```

#### SMS Configuration (Optional - for delivery verification):
```bash
railway variables --set "TWILIO_ACCOUNT_SID=your-twilio-sid"
railway variables --set "TWILIO_AUTH_TOKEN=your-twilio-token"
railway variables --set "TWILIO_PHONE_NUMBER=your-twilio-phone"
```

## 📊 Monitoring Your Deployment

### Check deployment status:
```bash
railway status
```

### View logs:
```bash
# View application logs
railway logs

# View build logs  
railway logs --build

# View deployment logs
railway logs --deployment
```

### Get your application URL:
```bash
railway domain
```

### Open your deployed app:
```bash
railway open
```

## 🔗 Railway Dashboard

Monitor your deployment at: https://railway.app/project/4a13f477-87b2-4d0f-b2ac-2d35107882fd

## 🏗️ Build Process

Your application uses the following build configuration from `railway.json`:

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE"
  }
}
```

The build process:
1. **Install dependencies**: Runs `npm install` and `npm install --prefix server`
2. **Build frontend**: Runs `npm run build` (TypeScript compilation + Vite build)
3. **Start server**: Runs `npm start` (starts the Express server serving both API and static files)

## 🎯 Next Steps

1. **Set environment variables** (if not done yet):
   - Run `./deploy.sh` for an interactive setup
   - Or manually set them using the Railway CLI commands above

2. **Verify deployment**:
   - Check `railway logs` for any errors
   - Visit your app URL to ensure it's working

3. **Configure domain** (optional):
   - Railway provides a default domain
   - You can add a custom domain in the Railway dashboard

## 🔧 Manual Environment Variable Setup

If you prefer to set environment variables manually:

```bash
# Email (Required)
railway variables --set "EMAIL_USER=your-smtp-email@domain.com"
railway variables --set "EMAIL_PASS=your-email-app-password"

# Twilio SMS (Optional)
railway variables --set "TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
railway variables --set "TWILIO_AUTH_TOKEN=your-auth-token"
railway variables --set "TWILIO_PHONE_NUMBER=+1234567890"
```

## 🚨 Troubleshooting

### Railway CLI Hanging Issues
If Railway CLI commands are hanging or not responding:

1. **Use Railway Dashboard**: https://railway.app/project/4a13f477-87b2-4d0f-b2ac-2d35107882fd
2. **Re-authenticate**:
   ```bash
   railway logout
   railway login
   ```
3. **Check connectivity**:
   ```bash
   curl -I https://railway.app
   ```

### Monitor Deployment via Dashboard
Since CLI might be unreliable, use the web dashboard:
- **Project URL**: https://railway.app/project/4a13f477-87b2-4d0f-b2ac-2d35107882fd
- **Build Logs**: Available in the dashboard under "Deployments"
- **Environment Variables**: Configurable in dashboard settings
- **Domain**: View and configure in dashboard

### Alternative Deployment Methods
1. **GitHub Integration** (Recommended):
   - Connect your GitHub repo in Railway dashboard
   - Auto-deploy on git push
   - Better reliability than CLI

2. **Manual Upload**:
   - Upload via Railway dashboard
   - Direct file upload option

### If deployment fails:
1. Check build logs: `railway logs --build`
2. Check deployment logs: `railway logs --deployment`
3. Verify package.json scripts are correct
4. Ensure all required dependencies are listed

### If the app doesn't start:
1. Check application logs: `railway logs`
2. Verify environment variables are set correctly
3. Check that the server starts on the correct port (Railway sets PORT automatically)

### Common issues:
- **Database**: The app uses SQLite by default, which works on Railway
- **File uploads**: Ensure the uploads directory is created properly
- **CORS**: Configured for Railway domains in production

## 🔄 Redeployment

To redeploy after making changes:

```bash
# Quick redeploy
railway up --detach

# Or use the deployment script
./deploy.sh
```

## 📁 Project Structure

Your deployed application includes:
- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + SQLite
- **Real-time**: Socket.IO for live updates
- **File storage**: Local file system for uploads
- **Email**: Nodemailer for notifications
- **SMS**: Twilio for delivery verification

The application is configured to serve both the API and the built React app from the same Express server, making it ideal for Railway's single-service deployment model.

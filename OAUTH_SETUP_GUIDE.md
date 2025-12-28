# Monday.com OAuth Setup Guide

## Step 1: Create Monday.com App

1. Go to: https://auth.monday.com/developers
2. Click **"Create App"**
3. Name: `Lead Routing System`
4. Select: **"For my own account"**

## Step 2: Get OAuth Credentials

1. In your app, go to **"OAuth"** section
2. Copy **Client ID**
3. Copy **Client Secret** (click "Show")

## Step 3: Add Redirect URI

Add this URL:
```
http://localhost:5173/register-org
```

For production, use your domain:
```
https://yourdomain.com/register-org
```

## Step 4: Set Permissions (Scopes)

Check these permissions:
- ✅ `me:read` - Read user info
- ✅ `account:read` - Read account info
- ✅ `boards:read` - Read boards
- ✅ `boards:write` - Write to boards
- ✅ `users:read` - Read users
- ✅ `workspaces:read` - Read workspaces

## Step 5: Save Credentials

Once you have the credentials, add them to `.env` file:

```bash
MONDAY_OAUTH_CLIENT_ID=your_client_id_here
MONDAY_OAUTH_CLIENT_SECRET=your_client_secret_here
MONDAY_OAUTH_REDIRECT_URI=http://localhost:5173/register-org
```

## Step 6: Restart Server

```bash
npm run dev
```

## Troubleshooting

**Problem:** "OAuth Not Configured" message
**Solution:** Make sure all three environment variables are set in `.env`

**Problem:** Redirect doesn't work
**Solution:** Verify the Redirect URI in Monday.com matches exactly

**Problem:** "Invalid scope" error
**Solution:** Make sure all required scopes are enabled in your Monday.com app


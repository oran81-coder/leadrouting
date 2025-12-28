# Quick OAuth Setup

## In 5 Minutes ⏱️

### 1. Open Monday Developers
```
https://auth.monday.com/developers
```

### 2. Create App
- Click "Create App"
- Name: `Lead Routing System`
- Type: For my own account

### 3. OAuth Settings
**Copy these:**
- Client ID
- Client Secret (click Show)

**Add Redirect URI:**
```
http://localhost:5173/register-org
```

**Enable Scopes:**
- ✅ me:read
- ✅ account:read  
- ✅ boards:read
- ✅ boards:write
- ✅ users:read
- ✅ workspaces:read

### 4. Run Setup
```powershell
.\setup-oauth.ps1
```

### 5. Restart Server
```powershell
npm run dev
```

### 6. Test
```
http://localhost:5173/#register
```

---

## Troubleshooting

**"OAuth Not Configured"** → Check `.env` file exists with all 3 variables

**"Invalid redirect_uri"** → URL must match exactly in Monday.com

**"Invalid scope"** → Enable all 6 scopes in Monday.com app

---

For detailed guide: `OAUTH_SETUP_COMPLETE_GUIDE_HE.md`


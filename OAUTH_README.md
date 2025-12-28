# Monday.com OAuth Setup - README

## 🚀 Quick Links

| File | Description | Language | Time |
|------|-------------|----------|------|
| [OAUTH_QUICK_START.md](./OAUTH_QUICK_START.md) | Fast setup guide | English | 5 min |
| [OAUTH_SETUP_GUIDE.md](./OAUTH_SETUP_GUIDE.md) | Standard guide | English | 10 min |
| [OAUTH_SETUP_COMPLETE_GUIDE_HE.md](./OAUTH_SETUP_COMPLETE_GUIDE_HE.md) | Complete guide | Hebrew | 15 min |
| [setup-oauth.ps1](./setup-oauth.ps1) | Interactive script | - | 3 min |

## 🎯 What You Need

1. **Monday.com account** with admin access
2. **5 minutes** of your time
3. **Browser** to access Monday.com Developers portal

## 📋 Quick Steps

```bash
# 1. Create Monday.com app at:
https://auth.monday.com/developers

# 2. Get credentials (Client ID & Secret)

# 3. Run setup script
.\setup-oauth.ps1

# 4. Restart server
npm run dev

# 5. Test
http://localhost:5173/#register
```

## ❓ Questions?

**Q: Do I need OAuth?**
A: Not required, but highly recommended for:
- Easy user registration
- Automatic Monday.com connection
- Better security

**Q: What if I skip OAuth?**
A: You can still:
- Use Email/Password login
- Manually configure Monday API token
- Work with seed data

**Q: Is it safe?**
A: Yes! OAuth2 is industry standard:
- Client Secret never exposed to browser
- Users never enter passwords in your system
- Can revoke access anytime

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| "OAuth Not Configured" | Check `.env` file has all 3 variables |
| "Invalid redirect_uri" | URL must match exactly in Monday.com |
| "Invalid scope" | Enable all 6 scopes in your app |
| "Invalid client_id" | Copy Client ID correctly (no spaces) |

## 📞 Support

If stuck:
1. Check Backend Logs (server terminal)
2. Check Browser Console (F12)
3. Re-run `.\setup-oauth.ps1`
4. Read the detailed guide in your language

---

**Ready to start?** → [OAUTH_QUICK_START.md](./OAUTH_QUICK_START.md)

**Want details?** → [OAUTH_SETUP_COMPLETE_GUIDE_HE.md](./OAUTH_SETUP_COMPLETE_GUIDE_HE.md) (עברית)


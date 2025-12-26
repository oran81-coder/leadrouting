# 🛠️ Development Scripts

This directory contains automation scripts to simplify the development workflow for the Lead Routing System.

---

## 📋 Available Scripts

### 1. `start-dev.ps1` - All-in-One Startup 🚀

**The easiest way to start everything!**

This script automates the entire development setup:
- ✅ Starts ngrok tunnel
- ✅ Extracts public URL
- ✅ Updates `.env` file automatically
- ✅ Starts backend server
- ✅ Registers webhook with Monday.com
- ✅ Opens frontend in browser

**Usage:**

```powershell
# Start everything (recommended)
.\scripts\start-dev.ps1

# Skip webhook registration
.\scripts\start-dev.ps1 -SkipWebhook

# Skip frontend opening
.\scripts\start-dev.ps1 -SkipFrontend

# Custom port (default 3000)
.\scripts\start-dev.ps1 -Port 3001
```

**What it does:**

1. Checks if ngrok is installed (installs if needed)
2. Starts ngrok tunnel (or detects if already running)
3. Updates `.env` with the new public URL
4. Starts backend server (or detects if already running)
5. Registers webhook automatically (optional)
6. Opens frontend in browser (optional)

**Output:**

```
============================================
  ✅ Development Environment Ready!
============================================

📍 Backend API:     http://localhost:3000
📍 Frontend UI:     http://localhost:5173
📍 Public URL:      https://abc123.ngrok.io
📍 ngrok Dashboard: http://localhost:4040
```

---

### 2. `check-ngrok-health.ps1` - Health Monitoring 🔍

Monitors ngrok tunnel health and optionally auto-restarts on failure.

**Usage:**

```powershell
# Single health check
.\scripts\check-ngrok-health.ps1

# Continuous monitoring (every 5 minutes)
.\scripts\check-ngrok-health.ps1 -Continuous

# Auto-restart on failure
.\scripts\check-ngrok-health.ps1 -Continuous -AutoRestart

# Custom interval (in seconds)
.\scripts\check-ngrok-health.ps1 -Continuous -IntervalSeconds 600

# Silent mode (logs only, no console output)
.\scripts\check-ngrok-health.ps1 -Continuous -Silent
```

**Features:**

- ✅ Checks if ngrok API is responding
- ✅ Verifies public URL is reachable
- ✅ Displays connection metrics
- ✅ Logs failures to `scripts/ngrok-health.log`
- ✅ Optional auto-restart on failure
- ✅ Updates `.env` with new URL after restart

**Output:**

```
[2025-12-26 19:00:00] Checking ngrok health...
   ✅ ngrok is healthy
      Public URL: https://abc123.ngrok.io
      Connections: 42
   ✅ Public URL is reachable
```

**Scheduling (Optional):**

You can schedule this script to run automatically using Windows Task Scheduler:

1. Open Task Scheduler
2. Create Basic Task
3. Name: "ngrok Health Monitor"
4. Trigger: "When I log on" or "Daily"
5. Action: "Start a program"
6. Program: `powershell.exe`
7. Arguments: `-ExecutionPolicy Bypass -File "C:\path\to\scripts\check-ngrok-health.ps1" -Continuous -AutoRestart`

---

## 🔧 Related Scripts (Root Directory)

### `register-webhook-auto.ts` - Smart Webhook Registration

Enhanced webhook registration with automatic cleanup and validation.

**Usage:**

```bash
npx tsx register-webhook-auto.ts
```

**Features:**

- ✅ Reads `PUBLIC_URL` from `.env` automatically
- ✅ Checks if webhook already exists
- ✅ Deletes old/inactive webhooks
- ✅ Registers new webhook with Monday.com
- ✅ Validates webhook endpoint is responding
- ✅ Provides clear error messages and troubleshooting tips

**Output:**

```
============================================
  🤖 Automated Webhook Registration
============================================

📋 Step 1: Checking environment configuration...
   ✅ PUBLIC_URL: https://abc123.ngrok.io
   ✅ WEBHOOK_SECRET: webhook-sec...

📋 Step 2: Finding board configuration...
   ✅ Board ID: 18393182279

📋 Step 3: Checking Monday.com connection...
   ✅ Monday.com credentials found

📋 Step 4: Checking existing webhook status...
   ℹ️  No existing webhook found

📋 Step 5: Cleaning up old webhooks...
   ℹ️  No old webhooks found

📋 Step 6: Registering new webhook...
   Target URL: https://abc123.ngrok.io/webhooks/monday
   Event: create_pulse
   ✅ Webhook registered successfully!
   Webhook ID: 123456789

📋 Step 7: Verifying database record...
   ✅ Webhook saved in database

✅ Validating webhook endpoint...
   ✅ Webhook endpoint is responding

============================================
  ✅ Webhook Setup Complete!
============================================
```

---

## 🎯 Recommended Workflow

### First Time Setup

```powershell
# 1. Run the all-in-one startup script
.\scripts\start-dev.ps1

# 2. Configure Monday.com in Admin Screen
# - Open http://localhost:5173
# - Go to Admin tab
# - Enter Monday.com API Token
# - Click Connect

# 3. Test webhook
# - Go to Monday.com
# - Add new item to your board
# - Check Manager Screen for new proposal
```

### Daily Development

```powershell
# Option 1: Use the startup script (easiest)
.\scripts\start-dev.ps1

# Option 2: Manual startup
# Terminal 1: Start ngrok
npx ngrok http 3000

# Terminal 2: Start backend
npm run dev

# Terminal 3: Start frontend
cd frontend
npm run dev

# Then register webhook
npx tsx register-webhook-auto.ts
```

### Continuous Monitoring (Optional)

```powershell
# Keep this running in a separate terminal
.\scripts\check-ngrok-health.ps1 -Continuous -AutoRestart
```

---

## ⚠️ Common Issues

### Issue: "ngrok is not installed"

**Solution:** The script will auto-install it, or run:
```powershell
npm install -g ngrok
```

### Issue: "ngrok authtoken required"

**Solution:** Sign up at https://ngrok.com and set authtoken:
```powershell
npx ngrok config add-authtoken YOUR_TOKEN
```

### Issue: "Port 3000 already in use"

**Solution:** Kill the process or use custom port:
```powershell
.\scripts\start-dev.ps1 -Port 3001
```

### Issue: "Webhook registration failed"

**Possible causes:**
1. Monday.com not connected → Configure in Admin Screen
2. Backend not running → Start backend first
3. PUBLIC_URL not set → Run `start-dev.ps1` first

### Issue: "ngrok keeps disconnecting"

**Solutions:**
1. **Short term:** Use `check-ngrok-health.ps1 -Continuous -AutoRestart`
2. **Better:** Upgrade to ngrok paid plan (stable tunnels)
3. **Best:** Switch to Cloudflare Tunnel (free, more stable)

---

## 📚 Additional Resources

- **Main README:** [`../README.md`](../README.md)
- **Webhook Setup Guide:** [`../WEBHOOK_SETUP.md`](../WEBHOOK_SETUP.md)
- **Quick Start Guide:** [`../QUICK_START_GUIDE.md`](../QUICK_START_GUIDE.md)
- **Development Plan:** [`../DEVELOPMENT_PLAN.md`](../DEVELOPMENT_PLAN.md)

---

## 🔮 Future Enhancements

Planned improvements for these scripts:

- [ ] Email/Slack notifications on ngrok failure
- [ ] Automatic server restart after ngrok restart
- [ ] Better logging and metrics
- [ ] Dashboard for monitoring multiple services
- [ ] Docker compose integration
- [ ] Cloudflare Tunnel support

---

## 💡 Tips

1. **Keep terminals open:** Don't close ngrok or server windows
2. **Use start-dev.ps1:** It's the easiest way to get started
3. **Monitor health:** Run health checks if you notice issues
4. **Check logs:** Look at `scripts/ngrok-health.log` for history
5. **Update .env:** After ngrok restart, `.env` is auto-updated

---

**Need help?** Check the main documentation or open an issue!


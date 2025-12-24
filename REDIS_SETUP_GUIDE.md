# Redis Setup Guide

**גרסה:** 1.0  
**תאריך:** דצמבר 24, 2025

---

## 📋 תוכן עניינים

1. [מהו Redis ולמה אנחנו צריכים אותו?](#מהו-redis-ולמה-אנחנו-צריכים-אותו)
2. [התקנה מקומית (Development)](#התקנה-מקומית-development)
3. [הגדרה ב-Production](#הגדרה-ב-production)
4. [בדיקה ואימות](#בדיקה-ואימות)
5. [טיפים ו-Troubleshooting](#טיפים-ו-troubleshooting)

---

## 🎯 מהו Redis ולמה אנחנו צריכים אותו?

**Redis** הוא in-memory data store המשמש כ-cache layer במערכת Lead Routing.

### יתרונות:
- ✅ הפחתה של עומס על מסד הנתונים
- ✅ שיפור משמעותי בזמני תגובה (10-100x faster)
- ✅ הקטנה של API calls ל-Monday.com (חיסכון בעלויות)
- ✅ יכולת טיפול ב-traffic גבוה יותר

### מה מאוחסן ב-cache?
- 📊 Agent metrics snapshots
- 👥 Monday.com user cache
- ⚙️ Routing state and settings
- 🗺️ Field mappings
- 📋 Board metadata

### האם Redis הכרחי?
**לא!** המערכת עובדת מצוין ללא Redis, אך Redis מספק שיפור ביצועים משמעותי ב-production.

---

## 🖥️ התקנה מקומית (Development)

### Option 1: Docker (מומלץ)

```bash
# Pull Redis image
docker pull redis:7-alpine

# Run Redis container
docker run -d \
  --name redis-leadrouting \
  -p 6379:6379 \
  redis:7-alpine

# Verify it's running
docker ps | grep redis
```

### Option 2: Windows (WSL/Native)

**באמצעות WSL2:**
```bash
# Update package list
sudo apt update

# Install Redis
sudo apt install redis-server -y

# Start Redis
sudo service redis-server start

# Verify
redis-cli ping
# Should return: PONG
```

**באמצעות Memurai (Windows native alternative):**
1. הורד מ-https://www.memurai.com/get-memurai
2. התקן והפעל
3. הוא מקשיב על port 6379 כברירת מחדל

### Option 3: macOS

```bash
# Install via Homebrew
brew install redis

# Start Redis
brew services start redis

# Verify
redis-cli ping
# Should return: PONG
```

---

## ⚙️ הגדרה באפליקציה

### 1. הגדר משתני סביבה

עדכן את `.env`:

```bash
# Redis Configuration
REDIS_ENABLED=true
REDIS_URL="redis://localhost:6379"
CACHE_TTL_SECONDS=300
```

### 2. אתחל את המערכת

```bash
# Install dependencies (if not already installed)
npm install

# Start the API server
npm run dev
```

### 3. בדוק את החיבור

בקש את `/health/detailed`:

```bash
curl http://localhost:3000/health/detailed
```

תגובה מצופה:
```json
{
  "ok": true,
  "status": "healthy",
  "dependencies": {
    "database": {
      "status": "healthy",
      "connected": true
    },
    "cache": {
      "status": "healthy",
      "enabled": true,
      "connected": true,
      "type": "redis"
    }
  }
}
```

---

## 🚀 הגדרה ב-Production

### Option 1: Redis Cloud (Managed Service)

**מומלץ ל-production!** שירות managed של Redis Labs.

1. **הירשם ל-Redis Cloud:**
   - https://redis.com/try-free/
   - בחר free tier (30MB - מספיק להתחלה)

2. **צור database:**
   - Database name: `leadrouting-prod`
   - Cloud: AWS / GCP / Azure
   - Region: הקרוב ביותר ל-API servers

3. **קבל את ה-connection string:**
   ```
   redis://default:PASSWORD@redis-12345.cloud.redislabs.com:12345
   ```

4. **הגדר environment variables:**
   ```bash
   REDIS_ENABLED=true
   REDIS_URL="redis://default:PASSWORD@redis-12345.cloud.redislabs.com:12345"
   CACHE_TTL_SECONDS=300
   ```

---

### Option 2: Self-Hosted (Docker Compose)

יצירת `docker-compose.yml`:

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: leadrouting-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

  api:
    build: .
    depends_on:
      - redis
    environment:
      - REDIS_ENABLED=true
      - REDIS_URL=redis://redis:6379
      - DATABASE_URL=file:/app/data/prod.db
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data

volumes:
  redis-data:
```

הרצה:
```bash
docker-compose up -d
```

---

### Option 3: Kubernetes

`redis-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        livenessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 30
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: redis
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
```

Apply:
```bash
kubectl apply -f redis-deployment.yaml
```

הגדר ב-API deployment:
```yaml
env:
- name: REDIS_ENABLED
  value: "true"
- name: REDIS_URL
  value: "redis://redis:6379"
```

---

## 🧪 בדיקה ואימות

### 1. בדוק חיבור Redis

```bash
# Option 1: CLI
redis-cli ping

# Option 2: Via application
curl http://localhost:3000/health/detailed | jq '.dependencies.cache'
```

### 2. בדוק שמתבצע caching

```bash
# Terminal 1: Monitor Redis commands
redis-cli monitor

# Terminal 2: Make API requests
curl http://localhost:3000/admin/metrics-config

# Terminal 1: Should show SETEX and GET commands
```

### 3. בדוק TTL

```bash
# Set a test key
redis-cli SET test:key "hello" EX 60

# Check TTL
redis-cli TTL test:key
# Should return ~60 seconds

# Wait 61 seconds
redis-cli GET test:key
# Should return (nil)
```

### 4. Performance Test

```bash
# Without Redis
REDIS_ENABLED=false npm run dev

# Measure response time
time curl http://localhost:3000/admin/metrics-config

# With Redis
REDIS_ENABLED=true npm run dev

# Measure response time (should be faster on second call)
time curl http://localhost:3000/admin/metrics-config
time curl http://localhost:3000/admin/metrics-config
```

---

## 🔧 Monitoring & Maintenance

### בדוק סטטיסטיקות Redis

```bash
redis-cli INFO stats

# Key metrics:
# - total_commands_processed
# - keyspace_hits (cache hits)
# - keyspace_misses (cache misses)
# - used_memory_human
```

### נקה cache ידנית

```bash
# Clear all cache
redis-cli FLUSHALL

# Clear specific pattern
redis-cli KEYS "agent_metrics:*" | xargs redis-cli DEL
```

### Monitor memory usage

```bash
redis-cli INFO memory

# Should see:
# used_memory: XXX
# used_memory_human: XX.XXM
# maxmemory: 268435456 (256MB if configured)
```

---

## 🛠️ טיפים ו-Troubleshooting

### בעיה: "Connection refused"

**פתרון:**
```bash
# Check if Redis is running
redis-cli ping

# If not, start it:
docker start redis-leadrouting
# OR
sudo service redis-server start
```

---

### בעיה: "WRONGTYPE Operation against a key"

**פתרון:** המפתח כבר קיים עם סוג שונה

```bash
# Delete the problematic key
redis-cli DEL problematic_key

# Or flush all
redis-cli FLUSHALL
```

---

### בעיה: Memory full

**פתרון:** הגדר eviction policy

```bash
# In redis.conf or command:
redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
```

**Eviction policies:**
- `allkeys-lru` - Remove least recently used keys (מומלץ)
- `volatile-lru` - Remove LRU keys with TTL
- `allkeys-random` - Remove random keys

---

### בעיה: Application לא משתמש ב-cache

**בדוק:**
1. `REDIS_ENABLED=true` ב-.env?
2. Redis running?
3. Check logs: `console.log` statements should show "Redis client connected"

**Debug:**
```typescript
import { isRedisHealthy, getRedisStatus } from "@core/cache/redis.client";

console.log("Redis status:", getRedisStatus());
console.log("Redis healthy:", isRedisHealthy());
```

---

### Performance Tuning

#### Redis Configuration
```bash
# Optimize for cache use case
redis-cli CONFIG SET maxmemory-policy allkeys-lru
redis-cli CONFIG SET maxmemory 512mb

# Persistence (optional for cache)
redis-cli CONFIG SET save ""  # Disable RDB snapshots
redis-cli CONFIG SET appendonly no  # Disable AOF
```

#### Application TTL Strategy
```typescript
// Short TTL for frequently changing data
CacheTTL.SHORT = 60; // 1 minute

// Medium TTL for semi-static data
CacheTTL.MEDIUM = 300; // 5 minutes

// Long TTL for static metadata
CacheTTL.LONG = 1800; // 30 minutes
```

---

## 📚 משאבים נוספים

- [Redis Official Docs](https://redis.io/docs/)
- [ioredis (Node.js client) Docs](https://github.com/redis/ioredis)
- [Redis Best Practices](https://redis.io/docs/reference/optimization/)
- [Redis Cloud Pricing](https://redis.com/redis-enterprise-cloud/pricing/)

---

## 🎯 סיכום

1. **Development:** השתמש ב-Docker או התקנה מקומית
2. **Production:** השתמש ב-Redis Cloud (managed) או self-hosted
3. **Configuration:** הגדר `REDIS_ENABLED=true` ו-`REDIS_URL`
4. **Monitoring:** עקוב אחר hit rate ו-memory usage
5. **Graceful Degradation:** המערכת עובדת ללא Redis!

---

**זכור:** Redis אופציונלי אבל מומלץ מאוד ב-production! 🚀


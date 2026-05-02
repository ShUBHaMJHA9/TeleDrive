# Deployment Guide

## Quick Test (Local)

### Option 1: Without Docker

1. **Start MongoDB locally**
```bash
# macOS (Homebrew)
brew services start mongodb-community

# Ubuntu/Linux
sudo systemctl start mongod

# Or use Docker
docker run -d -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=admin -e MONGO_INITDB_ROOT_PASSWORD=password mongo:7.0
```

2. **Backend**
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

3. **Frontend** (new terminal)
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Visit `http://localhost:5173`

### Option 2: Docker Compose (recommended for dev)

```bash
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop
docker-compose down
```

---

## Production Deployment

### 1. Environment Setup

Create `.env` for backend with:
```bash
NODE_ENV=production
PORT=3000
MONGO_URI=your_mongodb_atlas_url
JWT_SECRET=generate_with_openssl_rand_-_base64_32
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
FRONTEND_URL=https://your-domain.com
```

### 2. Choose Your Platform

#### Option A: Heroku

```bash
# Install Heroku CLI
brew tap heroku/brew && brew install heroku

# Login
heroku login

# Create app
heroku create your-telegram-drive

# Set environment variables
heroku config:set JWT_SECRET=$(openssl rand -base64 32)
heroku config:set MONGO_URI=mongodb+srv://...
heroku config:set TELEGRAM_API_ID=...
heroku config:set TELEGRAM_API_HASH=...

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

#### Option B: DigitalOcean App Platform

1. Push code to GitHub
2. Go to DigitalOcean > Apps > Create App
3. Connect GitHub repository
4. Configure services:
   - Backend (Node.js)
   - Frontend (Static site)
5. Add MongoDB Atlas connection string
6. Deploy

#### Option C: AWS ECS + RDS

1. **ECR Setup**
```bash
aws ecr create-repository --repository-name telegram-drive-backend
aws ecr create-repository --repository-name telegram-drive-frontend

# Push images
docker tag telegram-drive-backend:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/telegram-drive-backend:latest
aws ecr get-login-password | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/telegram-drive-backend:latest
```

2. **RDS MongoDB Atlas** (recommended for Mongo)
   Use MongoDB Atlas instead: https://www.mongodb.com/cloud/atlas

3. **ECS Cluster**
```bash
# Create cluster
aws ecs create-cluster --cluster-name telegram-drive

# Create task definitions and services
# (Use Terraform or CloudFormation for IaC)
```

#### Option D: DigitalOcean Kubernetes

```bash
# Create cluster
doctl kubernetes cluster create telegram-drive --region nyc3 --count 3

# Get kubeconfig
doctl kubernetes cluster kubeconfig save telegram-drive

# Deploy with Helm (create chart first)
helm repo add telegram-drive ./helm
helm install telegram-drive telegram-drive/telegram-drive -f values.prod.yaml
```

#### Option E: Self-Hosted (VPS)

```bash
# SSH to server (Ubuntu 22.04+)
ssh root@your_vps_ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone repo
git clone https://github.com/yourusername/Telegram-Drive.git
cd Telegram-Drive

# Setup environment
cp backend/.env.example backend/.env
# Edit backend/.env with production values

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d

# Setup Nginx reverse proxy
sudo apt install nginx
# Configure /etc/nginx/sites-available/default
# Point to localhost:3000 (backend) and localhost:5173 (frontend)

# SSL with Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 3. Database Setup

#### MongoDB Atlas (Recommended)

1. Go to https://mongodb.com/cloud/atlas
2. Create account and cluster
3. Configure IP whitelist (add your server IP or 0.0.0.0/0 for development)
4. Get connection string
5. Update `MONGO_URI` in `.env`

```
mongodb+srv://username:password@cluster.mongodb.net/telegram-drive
```

#### Self-Hosted MongoDB

```bash
# Docker
docker run -d \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=your_password \
  -v mongodb_data:/data/db \
  mongo:7.0

# Standalone
sudo apt install -y mongodb
sudo systemctl start mongodb
```

### 4. Building for Production

#### Backend
```bash
cd backend
npm install --production
npm run build  # if using TypeScript
```

Dockerfile:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

#### Frontend
```bash
cd frontend
npm install
npm run build   # Creates dist/
```

Dockerfile:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 5. SSL/HTTPS

#### Option 1: Let's Encrypt (Nginx)
```bash
sudo certbot certonly --standalone -d your-domain.com
# Certs in /etc/letsencrypt/live/your-domain.com/
```

#### Option 2: AWS Certificate Manager
```bash
aws acm request-certificate --domain-name your-domain.com
```

#### Option 3: Cloudflare
Use Cloudflare's free SSL and proxy through their CDN.

### 6. Monitoring & Logging

#### Sentry (Error Tracking)
```javascript
// In backend/src/server.js
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

app.use(Sentry.Handlers.errorHandler());
```

#### Datadog (Monitoring)
```javascript
// In main entry point
const tracer = require('dd-trace');
tracer.init();
```

#### ELK Stack (Logs)
```javascript
// Use winston logger
const logger = winston.createLogger({
  transports: [
    new elasticsearch.ElasticsearchTransport({
      level: 'info',
      clientOpts: { hosts: ['localhost:9200'] }
    })
  ]
});
```

### 7. CI/CD Pipeline (GitHub Actions)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Login to Docker Hub
        uses: docker/login-action@v1
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Build & Push Backend
        run: |
          docker build -t ${{ secrets.DOCKER_USERNAME }}/telegram-drive-backend:latest ./backend
          docker push ${{ secrets.DOCKER_USERNAME }}/telegram-drive-backend:latest
      
      - name: Deploy to Heroku
        run: |
          git push https://heroku:${{ secrets.HEROKU_API_KEY }}@git.heroku.com/${{ secrets.HEROKU_APP_NAME }}.git main

      - name: Notify Slack
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} -d '{"text":"Deployed to production"}'
```

### 8. Performance Optimization

#### Frontend
- Enable gzip compression
- Use CDN for static assets
- Minify JS/CSS (Vite automates)
- Implement code splitting
- Cache busting with hash

#### Backend
- Enable Redis caching
- Use connection pooling for MongoDB
- Implement rate limiting
- Use load balancing (nginx, HAProxy)
- Monitor memory usage

#### Database
- Create indexes on `ownerId`, `folderId`, `token`
- Archive old upload sessions
- Consider sharding if > 1TB

### 9. Backup & Disaster Recovery

```bash
# Backup MongoDB
mongodump --uri "mongodb+srv://user:pass@cluster.mongodb.net/telegram-drive" --out backup

# Restore
mongorestore --uri "mongodb+srv://user:pass@cluster.mongodb.net/telegram-drive" backup

# Schedule daily backups
0 2 * * * /usr/local/bin/backup.sh
```

### 10. Scaling

#### Horizontal Scaling
- Run multiple API instances behind load balancer
- Use Redis for distributed caching
- MongoDB Atlas auto-scaling
- Worker instances for upload processing

#### Vertical Scaling
- Increase server CPU/RAM
- Upgrade MongoDB cluster tier
- Add more storage

---

## Post-Deployment Checklist

- [ ] SSL certificate installed
- [ ] Firewall rules configured
- [ ] Environment variables set
- [ ] Database backups scheduled
- [ ] Monitoring/alerting configured
- [ ] Error tracking (Sentry)
- [ ] Rate limiting verified
- [ ] CORS configured correctly
- [ ] Logging centralized
- [ ] Cache warmup (if applicable)
- [ ] Performance benchmarked
- [ ] Security headers set (CSP, HSTS, etc.)
- [ ] Load testing completed
- [ ] DNS records updated
- [ ] CDN configured

---

## Troubleshooting

### Connection Issues
```bash
# Test MongoDB
mongosh "mongodb+srv://user:pass@cluster.mongodb.net/telegram-drive"

# Check port accessibility
curl -v http://localhost:3000/health
```

### Performance Issues
```bash
# Monitor CPU/Memory
top
docker stats

# Check database performance
db.collection.explain()
db.setProfilingLevel(1)
```

### Deployment Fails
```bash
# View logs
docker logs container_id
pm2 logs
heroku logs --tail

# Check disk space
df -h

# Check running processes
ps aux | grep node
```

---

See README.md for setup and architecture details.

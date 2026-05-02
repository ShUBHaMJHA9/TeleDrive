# 🚀 Quick Start Guide

## 1-Minute Setup

### Without Docker

```bash
# Terminal 1: Backend
cd backend
npm install
npm run dev

# Terminal 2: Frontend  
cd frontend
npm install
npm run dev

# Visit http://localhost:5173
# Login: phone = any number, code = 123456
```

### With Docker

```bash
docker-compose up -d
# Visit http://localhost:5173
```

---

## Project Overview

| Component | Tech | Port |
|-----------|------|------|
| Frontend | React 18 + Vite | 5173 |
| Backend | Express + Node.js | 3000 |
| Database | MongoDB | 27017 |
| Cache | Redis | 6379 |

---

## File Structure

```
frontend/
├── src/
│   ├── components/     # UI: Auth, FileManager, Dialogs, Cards
│   ├── hooks/          # useAuth, useChunkedUpload, useFileOperations
│   ├── store/          # Zustand: auth, files, uploads
│   ├── api/            # Axios client & endpoints
│   ├── styles/         # Tailwind + global CSS
│   └── App.jsx         # Main app with routing
├── package.json        # Dependencies
├── vite.config.js      # Vite config
└── tailwind.config.js  # Tailwind theme

backend/
├── src/
│   ├── models/         # MongoDB schemas
│   ├── routes/         # Express route handlers
│   ├── handlers/       # Business logic
│   ├── middleware/     # JWT auth
│   └── server.js       # Main Express app
├── package.json        # Dependencies
├── .env.example        # Environment template
└── Dockerfile          # Docker image config

docs/
├── architecture.md     # System design & data models
├── api.md              # Full API reference
└── deployment.md       # Deployment guide

docker-compose.yml     # Local dev setup
README.md              # Main documentation
```

---

## Key Features Built

### ✅ Frontend
- [x] **Login Screen** - Telegram OTP authentication
- [x] **File Manager** - Grid/list view with folders
- [x] **Drag-Drop Upload** - Chunked upload with progress
- [x] **Dialogs** - Create folder, rename, delete, share
- [x] **Header** - Search, view mode toggle, logout
- [x] **Upload Queue** - Real-time progress notifications
- [x] **Responsive** - Mobile-friendly Tailwind design

### ✅ Backend
- [x] **Auth Endpoints** - OTP verification, JWT tokens
- [x] **File Operations** - CRUD for files/folders
- [x] **Chunked Uploads** - Session management, resumability
- [x] **Sharing** - Public/private share links
- [x] **Rate Limiting** - 100 req/15min per IP
- [x] **MongoDB Schema** - User, File, Folder, Upload, Share models
- [x] **Error Handling** - Validation, auth checks

### ✅ DevOps
- [x] **Docker Compose** - One-command local dev
- [x] **Environment Templates** - .env.example files
- [x] **API Documentation** - Full endpoint reference
- [x] **Architecture Docs** - Data models, flows, scaling
- [x] **Deployment Guide** - Heroku, AWS, DigitalOcean, VPS

---

## Next Steps (To Implement)

### Short Term
1. **Real Telegram Integration** - Use gramjs for real OTP and uploads
2. **File Preview** - PDF viewer, image zoom, video player
3. **Search UI** - Advanced search with filters
4. **Settings Page** - Profile, preferences, security

### Medium Term
5. **Streaming** - HTTP Range requests for video/audio
6. **Real-time Sync** - WebSocket for live updates
7. **Mobile App** - React Native version
8. **Desktop App** - Electron version

### Long Term
9. **Collaboration** - Real-time editing, comments
10. **Encryption** - End-to-end encryption option
11. **Version Control** - File history and restore
12. **Activity Logs** - Audit trail

---

## Master AI Prompts

Ready-to-use prompts for extending features. See **README.md** section "Master AI Prompts" for 10 detailed prompts.

Examples:
- Add File Preview Component
- Implement Telegram Upload Worker
- Add Multi-Account Support
- Create Folder Tree Sidebar
- Real Telegram OTP Integration
- Advanced Search with Filters
- Settings & Preferences Page
- Production Deployment
- Performance Optimization
- React Native Mobile App

---

## Testing URLs

### Frontend
- `http://localhost:5173/` - Main app
- `http://localhost:5173/#/auth` - Login screen

### Backend API
- `http://localhost:3000/health` - Health check
- `http://localhost:3000/api/auth/telegram/request_code` - POST to get OTP
- `http://localhost:3000/api/folders/root` - GET folder contents (needs JWT)

### MongoDB
- `mongodb://localhost:27017/telegram-drive`
- Default: no auth (local dev)
- Production: `MONGO_URI=mongodb+srv://...`

---

## Demo Credentials

**Development Mode Only:**
```
Phone: +1 (any number)
Code: 123456
```

This logs in automatically with demo data. **Remove in production!**

---

## Environment Setup

### Frontend (.env.local)
```
REACT_APP_API_URL=http://localhost:3000/api
```

### Backend (.env)
```
NODE_ENV=development
PORT=3000
MONGO_URI=mongodb://localhost:27017/telegram-drive
JWT_SECRET=any-secret-key-for-dev
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
FRONTEND_URL=http://localhost:5173
```

---

## Commands

### Frontend
```bash
npm run dev              # Start dev server (http://localhost:5173)
npm run build            # Production build
npm run preview          # Preview production build
```

### Backend
```bash
npm run dev              # Start with hot reload
npm start                # Start production
npm run lint             # Run linter
```

### Docker
```bash
docker-compose up -d     # Start all services
docker-compose logs -f   # View logs
docker-compose down      # Stop all services
```

---

## Architecture at a Glance

```
User (Browser)
    ↓
    ├─ Login: POST /auth/telegram/verify_code → JWT
    │
    ├─ Upload File
    │  ├─ Client: Split into 5MB chunks
    │  ├─ POST /uploads/init → get uploadId
    │  ├─ POST /uploads/:id/chunk (x N) → upload chunks
    │  └─ POST /uploads/:id/commit → finalize (worker uploads to Telegram)
    │
    ├─ Browse Files
    │  ├─ GET /folders/:id → list files & folders
    │  └─ Store in MongoDB with metadata
    │
    └─ Share & Download
       ├─ POST /shares → create public link
       └─ Download or stream via Telegram file IDs
```

---

## Common Issues

### Backend won't start
```bash
# Check MongoDB is running
mongosh
# Should connect successfully

# Check port 3000 is free
lsof -i :3000
```

### Frontend shows "Cannot connect to API"
```bash
# Ensure backend is running
curl http://localhost:3000/health

# Check API URL in frontend .env
# Should be: REACT_APP_API_URL=http://localhost:3000/api
```

### Docker issues
```bash
# Remove all containers
docker-compose down -v

# Rebuild
docker-compose build

# Start fresh
docker-compose up
```

---

## Performance Tips

1. **Large File Uploads**: Increase chunk size to 10MB (requires backend adjustment)
2. **Slow Network**: Reduce chunk size to 1MB and increase concurrency
3. **Database Queries**: Add indexes on `ownerId`, `folderId`
4. **Caching**: Add Redis for frequently accessed folders
5. **UI**: Virtualize large file lists with react-window

---

## Security Checklist

Before production:

- [ ] Change JWT_SECRET in .env
- [ ] Use real Telegram OTP (gramjs integration)
- [ ] Enable HTTPS/SSL
- [ ] Set proper CORS origins
- [ ] Remove demo credentials
- [ ] Validate file types & sizes
- [ ] Add rate limiting per user (not just IP)
- [ ] Implement audit logging
- [ ] Regular backups scheduled
- [ ] Monitor error logs with Sentry

---

## Resources

- 📖 [Full API Docs](./docs/api.md)
- 🏗️ [Architecture Guide](./docs/architecture.md)
- 🚀 [Deployment Guide](./docs/deployment.md)
- 💬 [Master Prompts](./README.md#-master-ai-prompts)

---

## Support

- Open [Issues](https://github.com/ShUBHaMJHA9/Telegram-Drive/issues) on GitHub
- Check existing documentation
- Review backend logs: `npm run dev`
- Check browser console for frontend errors

---

**Made with ❤️ by the Community**

Want to contribute? Fork, branch, and send a PR! 🚀

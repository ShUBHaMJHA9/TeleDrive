# 📱 Telegram Drive - Unlimited Cloud Storage

Production-ready, full-stack cloud storage system built on Telegram. Store unlimited files using chunking and Telegram's infrastructure. Features Google Drive-like UI with drag-and-drop, folder management, sharing links, and more.

![Architecture](./docs/architecture.md)

## ✨ Features

### Core
- 🔐 **Telegram OTP Login** - Secure authentication via Telegram
- 📁 **Folder Management** - Create, rename, organize folders
- ⬆️ **Drag-and-Drop Upload** - Chunked uploads with progress tracking
- 📊 **Unlimited Storage** - Split files into chunks (stored in Telegram)
- 🔍 **Search & Filter** - Find files instantly
- 🗑️ **Delete & Rename** - Manage files with context menus

### Sharing & Access
- 🔗 **Public Share Links** - Generate shareable URLs
- 🔒 **Private Sharing** - Access control with allowed users
- ⏰ **Link Expiration** - Set expiry dates on shares
- 👥 **Multi-Account** - Link multiple Telegram accounts

### Media
- 🎬 **Video Streaming** - Stream video directly from Telegram
- 🎵 **Audio Streaming** - Play audio files
- 🖼️ **Image Preview** - Inline image viewer
- 📑 **PDF Preview** - PDF.js integration

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Docker & Docker Compose (optional)

### Local Development (Without Docker)

1. **Clone & Setup**
```bash
git clone https://github.com/ShUBHaMJHA9/Telegram-Drive.git
cd Telegram-Drive
```

2. **Backend Setup**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI
npm run dev
```

Backend runs on `http://localhost:3000`

3. **Frontend Setup** (in new terminal)
```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

4. **Test Login**
   - Phone: Any number (e.g., `+1234567890`)
   - Code: `123456` (demo mode)

### Docker Setup

```bash
# Copy env templates
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- MongoDB: `localhost:27017`
- Redis: `localhost:6379`

## 📁 Project Structure

```
Telegram-Drive/
├── frontend/               # React + Tailwind UI
│   ├── src/
│   │   ├── components/    # Auth, FileManager, Dialogs, etc.
│   │   ├── hooks/         # useAuth, useChunkedUpload, useFileOperations
│   │   ├── store/         # Zustand stores (auth, files, uploads)
│   │   ├── api/           # Axios client
│   │   ├── styles/        # Global CSS & Tailwind
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
│
├── backend/               # Node.js + Express
│   ├── src/
│   │   ├── models/        # MongoDB schemas
│   │   ├── routes/        # API endpoints
│   │   ├── handlers/      # Business logic
│   │   ├── middleware/    # JWT auth, rate limiting
│   │   └── server.js
│   ├── package.json
│   └── Dockerfile
│
├── docs/
│   ├── architecture.md
│   ├── api.md
│   └── deployment.md
│
├── docker-compose.yml
└── README.md
```

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/telegram/request_code    Request OTP
POST   /api/auth/telegram/verify_code     Verify OTP
POST   /api/auth/refresh                  Refresh JWT
POST   /api/auth/logout                   Logout
```

### Files & Folders
```
GET    /api/folders/:id                   Get folder contents
POST   /api/folders                       Create folder
PATCH  /api/folders/:id                   Rename folder
DELETE /api/folders/:id                   Delete folder

GET    /api/files/:id/metadata            Get file info
GET    /api/files/:id/stream              Stream file
PATCH  /api/files/:id                     Rename/move file
DELETE /api/files/:id                     Delete file
```

### Uploads (Chunked)
```
POST   /api/uploads/init                  Initialize session
POST   /api/uploads/:id/chunk             Upload chunk
POST   /api/uploads/:id/commit            Finalize
GET    /api/uploads/:id/status            Get status
```

### Sharing
```
POST   /api/shares                        Create share link
GET    /api/shares/:token                 Resolve share (public)
PATCH  /api/shares/:id                    Update permissions
```

Full API docs: [docs/api.md](./docs/api.md)

## 🎯 Master AI Prompts

Use these prompts with Claude, ChatGPT, or similar LLMs to generate code quickly.

### 1. Add File Preview Component
```
Generate a React component for previewing files:
- Images: inline canvas with zoom controls
- PDFs: use react-pdf library
- Video/Audio: HTML5 player with streaming support
- Text files: syntax highlighting with react-syntax-highlighter

Component should:
- Accept fileId and streamUrl props
- Handle loading and error states
- Support fullscreen mode
- Responsive design with Tailwind CSS

Export as PreviewComponent and include in FileManager modal.
```

### 2. Implement Telegram Upload Worker
```
Write a Node.js worker for uploading chunks to Telegram:
- Read UploadSession from MongoDB
- Download chunks from temp storage
- Use gramjs to upload each chunk to Telegram's Saved Messages
- Save returned file_ids in File.chunks
- Handle rate limiting and retries with exponential backoff
- Mark file as ready when complete

Include error recovery and logging. Use BullMQ for job queue if available.
```

### 3. Add Multi-Account Support
```
Enhance the auth system to support multiple Telegram accounts:
- Allow users to link multiple accounts
- Save encrypted session data per account
- Add account switcher in FileManager header
- Separate storage by account

Update:
- AuthScreen: "Link Another Account" button
- FileManager: Account dropdown showing linked devices
- Zustand store: active account selection
- API: /api/auth/link-account endpoint
```

### 4. Implement Folder Tree View (Sidebar)
```
Create a React component for a collapsible folder tree:
- Left sidebar with folder hierarchy
- Expandable/collapsible folders
- Drag-and-drop to move items
- Right-click context menu (rename, delete, move)
- Search highlighting
- Breadcrumb at top

Use:
- react-beautiful-dnd for drag-drop
- Recursive folder fetching
- Zustand for state
- Lucide icons

Replace current breadcrumb with this tree view.
```

### 5. Add Real Telegram OTP (gramjs Integration)
```
Implement real Telegram OTP authentication:

Create /backend/src/lib/telegramClient.js with:
- gramjs-based MTProto client
- Phone code request via Telegram
- Session persistence (encrypted)
- Utilities for file upload to Telegram

Replace mock OTP in auth handlers:
- requestCode(): call client.sendCodeRequest(phone)
- verifyCode(): call client.signIn(phone, code)
- Handle session errors and reconnection

Store encrypted sessions in User.sessionData.
```

### 6. Implement Search with Filters
```
Add advanced file search to FileManager:

Create /frontend/src/components/SearchBar.jsx with:
- Text search query
- Filter dropdowns: file type, date range, size range
- Sort options: name, date, size

API endpoint:
GET /api/search?q=&type=image&mimeType=image/*&createdAfter=&createdBefore=&sizeMin=&sizeMax=&sort=

Update FileManager:
- Show search results in modal or dedicated page
- Highlight matches
- Preserve folder navigation
```

### 7. Add Settings & Preferences
```
Create a Settings page in React:
- Profile editing (name, photo)
- Storage quota display
- Download history
- Security: password, 2FA
- Privacy: link expiration defaults
- Theme: dark/light mode

Components:
- SettingsPage.jsx with tabs
- ProfileSettingsSection.jsx
- SecuritySettingsSection.jsx
- PreferencesSettingsSection.jsx

Add /api/settings/* endpoints and Zustand store for UI state.
```

### 8. Deploy to Production (Docker + K8s)
```
Create production-grade deployment:

1. Update Dockerfile with multi-stage builds
2. Add Kubernetes manifests:
   - Deployment for backend/frontend
   - Service for load balancing
   - ConfigMap for env vars
   - Secret for JWT key
   - PersistentVolume for MongoDB
3. Add Helm chart for easy deployment
4. Include health checks and resource limits
5. Add ingress for HTTPS

Provide deployment commands for GKE/AWS EKS/DigitalOcean.
```

### 9. Optimize Performance
```
Improve Telegram Drive performance:
- Add Redis caching for folder listings
- Implement file compression on upload
- Use CDN for image thumbnails
- Pagination for large folders
- Prefetch on folder hover
- IndexedDB cache on client

Provide benchmarks and metrics collection.
```

### 10. Mobile App (React Native)
```
Generate React Native scaffolding:
- Auth screen with phone input
- File manager with grid view
- Upload from device camera/gallery
- Download with progress
- Share links UI

Use: React Native, Expo, Zustand (same store)
API client: Same axios setup, works cross-platform
```

## 🔐 Security

### In Production
- ✅ Change JWT secret in `.env`
- ✅ Use HTTPS/TLS
- ✅ Enable CORS properly
- ✅ Rate limiting active
- ✅ Validate file types
- ✅ Sanitize file names
- ✅ Encrypt sessions at rest
- ✅ Use secure password hashing (bcryptjs)
- ✅ Implement audit logging
- ✅ Regular backups

### Optional
- Encrypt files end-to-end client-side
- Require 2FA for sensitive operations
- Implement access logs

## 📊 Database Schema

See [docs/architecture.md](./docs/architecture.md) for:
- User model
- File model
- Folder model
- UploadSession model
- Share model

## 🚢 Deployment

### Option 1: Docker Compose (Single Server)
```bash
docker-compose -f docker-compose.yml up -d
```

### Option 2: Heroku
```bash
heroku create your-telegram-drive
git push heroku main
```

### Option 3: AWS (ECS + RDS + S3)
See [docs/deployment.md](./docs/deployment.md)

### Option 4: DigitalOcean App Platform
```bash
doctl apps create --spec app.yaml
```

## 🛠️ Development

### Frontend
```bash
cd frontend
npm install
npm run dev              # Start dev server
npm run build            # Production build
npm run lint             # Run ESLint
```

### Backend
```bash
cd backend
npm install
npm run dev              # Start with hot reload
npm start                # Start production
npm run lint             # Run ESLint
```

### Testing
```bash
# Frontend
npm test

# Backend (TODO)
npm test
```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file

## 🆘 Support

- 📖 [Full Documentation](./docs/)
- 🐛 [Issues](https://github.com/ShUBHaMJHA9/Telegram-Drive/issues)
- 💬 [Discussions](https://github.com/ShUBHaMJHA9/Telegram-Drive/discussions)

## 🙏 Acknowledgments

- Built with [gramjs](https://gramjs.org/)
- UI with [React](https://react.dev/) & [Tailwind CSS](https://tailwindcss.com/)
- Backend with [Express](https://expressjs.com/) & [MongoDB](https://mongodb.com/)
- Icons from [Lucide](https://lucide.dev/)

---

**Made with ❤️ for the open-source community**

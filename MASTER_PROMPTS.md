# Master AI Prompts for Telegram Drive

**Project by: ShUBHaMJHA9**

Use these prompts with Claude, ChatGPT, or similar LLMs to quickly extend features. Each prompt is self-contained and production-ready.

---

## 1. Add File Preview Component (Images, PDFs, Video, Audio)

**Use case**: Users want to view files inline without downloading.

```
Generate a complete React component for previewing different file types:

Requirements:
- Images: Display with zoom (+/-), pan, and fullscreen controls
- PDFs: Integrate react-pdf library (1-2 page viewer with navigation)
- Video: HTML5 <video> player with controls, subtitle support
- Audio: HTML5 <audio> player with timeline
- Text files: Syntax highlighting for code files (react-syntax-highlighter)
- Fallback: Download button for unsupported types

Component signature:
export const FilePreview = ({ fileId, streamUrl, fileName, mimeType, size })

Props:
- fileId: string - MongoDB file ID
- streamUrl: string - API endpoint for streaming (with Range header support)
- fileName: string - Display name
- mimeType: string - MIME type for auto-detection
- size: number - File size in bytes

Features:
- Loading spinner while fetching
- Error boundary with retry button
- Responsive (work on mobile with touch gestures)
- Keyboard shortcuts (arrow keys, Esc)
- Download button
- Share link button
- Fullscreen mode

Styling: Tailwind CSS, match existing UI in FileManager

Export as:
- export { FilePreview }
- Add to /frontend/src/components/

Integration:
- Call from FileManager when double-clicking file
- Show in modal overlay
- Close on Esc or outside click
```

---

## 2. Implement Telegram Upload Worker (Node.js)

**Use case**: Move file uploads to Telegram out of the API critical path.

```
Create a Node.js worker service that processes file uploads to Telegram:

File: /backend/src/workers/uploadWorker.js

Requirements:
- Use BullMQ with Redis for job queue (or in-memory fallback)
- Read UploadSession from MongoDB
- Download chunks from temporary storage (or use stream)
- Use gramjs to upload each chunk to Telegram
- Save returned file_ids in File.chunks
- Handle rate limiting (Telegram limits ~200 req/min)
- Implement exponential backoff on 429 errors

Worker logic:
1. Dequeue job: { uploadId, fileId }
2. Fetch UploadSession and File records
3. For each chunk index:
   a. Download chunk data (5MB at a time)
   b. Get gramjs client for user
   c. Call client.uploadFile(stream) with Telegram parameters
   d. Save returned file_id in File.chunks[index].telegramFileId
   e. Emit progress event (if using WebSocket)
4. Mark File.status = 'ready'
5. Delete UploadSession (auto-cleanup after 24h via TTL)

Error handling:
- Retry failed chunks up to 3 times
- Exponential backoff: 2s, 4s, 8s, 16s
- If all retries fail, mark File.status = 'failed' and notify user
- Log all errors with structured data

Integration:
- Enqueue job from /api/uploads/:uploadId/commit endpoint
- Return 202 Accepted immediately (async)
- Emit WebSocket event: { type: 'file:ready', fileId }

Dependencies:
- gramjs
- bullmq
- redis (if using BullMQ)

Example job payload:
{
  uploadId: "550e8400-e29b-41d4-a716-446655440000",
  fileId: "507f1f77bcf86cd799439014"
}

Provide:
1. uploadWorker.js with worker implementation
2. Update server.js to start worker
3. Update /routes/uploads.js to enqueue jobs
4. Docker Compose environment for Redis
```

---

## 3. Add Multi-Account Support

**Use case**: Users can link multiple Telegram accounts and switch between them.

```
Enhance authentication to support multiple linked accounts:

Changes needed:

1. Update User schema (/backend/src/models/index.js):
   - NEW: linkedAccounts: [
       {
         telegramId: Number,
         sessionData: String (encrypted),
         phone: String,
         isPrimary: Boolean,
         connectedAt: Date
       }
     ]
   - Change: sessionData → move to linkedAccounts

2. Frontend UI - AuthScreen.jsx:
   - After login, show "Link Another Account" button
   - Users can have 5 accounts max
   - Add account management page

3. Frontend Header - FileManager.jsx:
   - New dropdown showing: "Telegram (@username)" with linked accounts
   - Click to switch account
   - Radio button for primary account
   - Remove button with confirm dialog

4. API Endpoints:

   POST /api/auth/link-account
   - Initiate linking flow
   - Return: {requestCode url or QR}

   POST /api/auth/link-verify
   - Verify code from new account
   - Add to linkedAccounts array
   - Return: list of linked accounts

   GET /api/auth/accounts
   - List all linked accounts
   - Show: phone, isPrimary, connectedAt

   POST /api/auth/switch-account/:telegramId
   - Switch active account
   - Generate new JWT for different account
   - Storage switches to that account's folder

   DELETE /api/auth/accounts/:telegramId
   - Unlink account
   - Can't delete primary account (must set new primary first)

5. Zustand store updates:
   - activeAccount: { telegramId, phone, isPrimary }
   - linkedAccounts: [...]
   - switchAccount(telegramId)

6. Storage consideration:
   - All files/folders scoped by both ownerId AND activeAccount
   - Ensure user sees correct account's files after switch
   - Each account has separate folder structure

7. Security:
   - Validate user owns all linked accounts
   - Encrypt sessions per account
   - Rate limit linking attempts (1 per minute)

8. Testing:
   - Link 2+ accounts
   - Verify file access is account-specific
   - Test account switching
   - Test unlinking

Deliverables:
1. Updated models
2. New auth endpoints with handlers
3. Updated React components
4. Updated Zustand store
5. Migration script (if existing live data)
```

---

## 4. Create Collapsible Folder Tree (Sidebar)

**Use case**: Replace breadcrumb with visual folder hierarchy.

```
Build a left sidebar with expandable folder tree:

Component: /frontend/src/components/FolderTreeSidebar.jsx

Structure:
┌─────────────────┐
│ 📁 My Drive     │
│  ├─ 📁 Documents │ (expandable)
│  │   ├─ 📄 file1  │
│  │   └─ 📁 Reports│
│  ├─ 📁 Videos    │
│  └─ 📁 Archive   │
└─────────────────┘

Features:
- Expandable/collapsible folders (with arrow icon)
- Right-click context menu: rename, delete, move, new folder
- Drag-and-drop to move items
- Search highlighting (highlight folders matching search query)
- Active folder highlight
- Folder count badge (optional: show file count)
- Lazy load child folders (fetch on expand)
- Keyboard navigation (arrow keys to expand/collapse)

Props:
- currentFolderId: string
- onFolderSelect: (folderId) => void
- onContextMenu: (action, folderId) => void
- searchQuery: string (highlight matching)

Uses:
- Zustand for folder state
- react-beautiful-dnd for drag-drop
- Lucide icons
- TailwindCSS

Integration in FileManager:
- Replace <Breadcrumb /> with sidebar layout
- Split layout: sidebar (w-64) + main content
- Responsive: hide sidebar on mobile (hamburger menu)

Functions:
- renderFolder(folder, depth, isExpanded)
- toggleExpanded(folderId)
- handleDrop(source, destination)
- handleContextMenu(e, folderId)
- filterFolders(query)

Styling notes:
- Indentation: depth * 1rem
- Hover background: gray-100
- Active: blue-500 text + bg-blue-50
- Icons: Folder (closed) / FolderOpen (expanded)
- Drag overlay: opacity-50, blue-500 border

Deliverables:
1. FolderTreeSidebar.jsx
2. Updated FileManager.jsx (layout changes)
3. Updated Zustand store (expanded state)
4. CSS for styling
```

---

## 5. Real Telegram OTP Login (gramjs Integration)

**Use case**: Replace mock auth with real Telegram MTProto sign-in.

```
Implement real Telegram authentication using gramjs:

Files to create/update:
1. /backend/src/lib/telegramClient.js - MTProto wrapper
2. /backend/src/handlers/auth.js - Auth logic
3. /backend/src/middleware/encrypt.js - Session encryption

TelegramClient class:

class TelegramClient {
  constructor(apiId, apiHash, sessionDir = './sessions')
  
  async requestCode(phone)
    // Send OTP via Telegram
    // Returns: { success, waiting }
  
  async signIn(phone, code)
    // Verify code and login
    // Returns: { user: { id, username, firstName }, session }
  
  async getSession()
    // Get current session object
  
  async uploadFile(path, fileName, chatId)
    // Upload file to Telegram
    // Returns: { fileId, accessHash }
}

Implementation details:

1. Session storage:
   - Use StringSession from gramjs
   - Encrypt with user+appSecret
   - Store in User.sessionData field
   - Decrypt on use

2. MTProto flow:
   - Create client instance for each user
   - client.connect()
   - client.sendCodeRequest(phone) → wait for Telegram notification
   - User enters code, API calls client.signIn(phone, code)
   - Save encrypted session for future logins

3. Error handling:
   - Catch phone banned (invalid phone)
   - Catch invalid code (wrong code)
   - Catch session expired (re-login)

4. API changes:

   POST /auth/telegram/request_code
   - Input: { phone }
   - Old: Return mock code
   - New: Call telegramClient.requestCode(phone)
   - Return: { success: true, waiting: true }

   POST /auth/telegram/verify_code
   - Input: { phone, code }
   - Old: Verify against in-memory store
   - New: Call telegramClient.signIn(phone, code)
   - On success: Create user, save encrypted session
   - Return: { token (JWT), user }

5. Update User model:
   - sessionData: String (encrypted StringSession)
   - lastLogin: Date
   - sessionExpired: Boolean

6. Session recovery:
   - On API startup, test each user's session
   - If expired, require re-login
   - Set sessionExpired: true in DB

7. Testing:
   - Create test phone number in Telegram sandbox (optional)
   - Or manually test with personal phone
   - Verify OTP arrives in Telegram app
   - Verify session persists across restarts

Deliverables:
1. telegramClient.js wrapper class
2. encrypt.js utilities (AES encryption)
3. Updated auth.js handlers
4. Updated User model
5. Migration script (clear demo sessions)
6. Error messages for edge cases
7. Session recovery mechanism
```

---

## 6. Advanced File Search with Filters

**Use case**: Users want to find files by type, date, size, etc.

```
Add advanced search UI and backend filtering:

Frontend: SearchBar component (/frontend/src/components/SearchBar.jsx)

UI layout:
┌─────────────────────────────────┐
│ 🔍 Search  [Type ▼] [Date ▼]    │
│ Query: ____________              │
│                                  │
│ Type: ☐ Any  ☐ Image  ☐ Video  │
│       ☐ Audio ☐ Document ☐ Code │
│                                  │
│ Date: ☐ Any  ☐ Today ☐ Week    │
│       ☐ Month ☐ Year ☐ Custom  │
│       [From _____] [To _____]   │
│                                  │
│ Size: ☐ Any  ☐ <1MB ☐ 1-100MB │
│       ☐ 100-1GB ☐ >1GB          │
│                                  │
│ [Search] [Reset]                │
└─────────────────────────────────┘

Features:
- Real-time search (debounce 500ms)
- Multi-select filters (checkboxes)
- Custom date range picker
- Size range filters
- Search highlighting in results
- Sort options: relevance, date, size, name
- Pagination

Backend changes:

GET /api/search?
  q=query &
  type=image&
  mimeType=image/ &
  createdAfter=2024-01-01 &
  createdBefore=2024-01-31 &
  sizeMin=1048576 &
  sizeMax=104857600 &
  sortBy=date &
  sortOrder=desc &
  page=1 &
  limit=50

Response:
{
  results: [
    { _id, name, type, size, path, mimeType, createdAt, score }
  ],
  total: 342,
  page: 1,
  pageSize: 50
}

Database queries:
- Index on: ownerId, createdAt, mimeType, size
- Use MongoDB text search for full-text queries
- Or use ESLint for advanced search (future)

Handlers (/backend/src/handlers/search.js):

export const search = async (req, res) => {
  const { q, type, mimeType, createdAfter, createdBefore, sizeMin, sizeMax, sortBy, sortOrder, page, limit } = req.query
  const userId = req.user.userId

  const query = {
    ownerId: userId,
    // Build dynamic filters
  }

  // If text query, search name + description
  if (q) query.$text = { $search: q }

  // Date range
  if (createdAfter || createdBefore) {
    query.createdAt = {}
    if (createdAfter) query.createdAt.$gte = new Date(createdAfter)
    if (createdBefore) query.createdAt.$lte = new Date(createdBefore)
  }

  // Size
  if (sizeMin || sizeMax) {
    query.size = {}
    if (sizeMin) query.size.$gte = parseInt(sizeMin)
    if (sizeMax) query.size.$lte = parseInt(sizeMax)
  }

  // MIME type
  if (mimeType) query.mimeType = new RegExp(mimeType, 'i')

  // Execute
  const results = await File.find(query)
    .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
    .skip((page - 1) * limit)
    .limit(limit)

  const total = await File.countDocuments(query)

  res.json({ results, total, page, pageSize: limit })
}

MIME type categories:
- image/*: images
- audio/*: audio
- video/*: video
- application/pdf, text/*: documents
- application/json, text/plain, etc: code

Integration:
- Add SearchBar to FileManager header
- Show results in modal or dedicated page
- Highlight matches using mark.js
- Cache recent searches (localStorage)

Deliverables:
1. SearchBar.jsx component (UI)
2. search.js handlers (backend logic)
3. search.js route (Express)
4. Zustand store for search state
5. Results display component
6. Database indexes
```

---

## 7. Settings & Preferences Page

**Use case**: Users manage profile, security, and preferences.

```
Create comprehensive settings page:

Route: /settings

Layout - Tabs:
1. Profile
2. Security
3. Preferences
4. Downloads (history)
5. Advanced

Components:

ProfileSettingsSection:
- Avatar upload
- Name, bio
- Email (optional)
- Phone (read-only, from Telegram)
- Save button

SecuritySettingsSection:
- Change password / 2FA (future)
- Active sessions (list with revoke)
- Download history
- API tokens for integrations (future)
- Export data button

PreferencesSettingsSection:
- Theme: dark/light/auto
- Language: en, es, fr, etc
- Default upload folder
- Auto-play media: yes/no
- Notifications: on/off
- Email notifications (future)
- Storage display units: GB/GiB

DownloadHistorySection:
- List of last 50 downloads
- Date, file name, size
- Re-download button
- Clear history button

AdvancedSection:
- Cache clear
- Storage quota info
- API docs link
- About & version
- Debug mode toggle (dev)

Implementation:

Frontend: /frontend/src/pages/SettingsPage.jsx

Components:
- SettingsPage.jsx (main page)
- ProfileSettings.jsx
- SecuritySettings.jsx
- PreferencesSettings.jsx
- DownloadHistory.jsx
- AdvancedSettings.jsx

Zustand store:
- preferences: { theme, language, autoPlay, notifications }
- user profile data
- downloadHistory: []

API endpoints:

PATCH /api/me/profile
- { name, bio, avatarUrl }

PATCH /api/me/preferences
- { theme, language, autoPlay, notifications }

GET /api/me/sessions
- List active sessions

DELETE /api/me/sessions/:sessionId
- Revoke session

GET /api/me/downloads
- Download history

POST /api/me/export-data
- Export all data as JSON

Styling:
- Tailwind CSS
- Form fields with labels
- Save/Cancel buttons
- Success/error toasts
- Confirmation dialogs for destructive actions

Integration in FileManager:
- Add Settings icon to header
- Link to /settings
- Or show as modal

Deliverables:
1. SettingsPage.jsx and sub-components
2. API endpoints and handlers
3. Zustand store updates
4. Route setup
5. Navigation link in header
```

---

## 8. Production Deployment (Docker + Kubernetes)

**Use case**: Deploy Telegram Drive to AWS EKS, GKE, or self-managed K8s.

```
Create production-grade deployment:

1. Multi-stage Dockerfiles (optimized size)

backend/Dockerfile:
FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build (if using TypeScript)

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json ./
ENV NODE_ENV=production
EXPOSE 3000
HEALTHCHECK CMD node -e "require('http').get('http://localhost:3000/health')"
CMD ["npm", "start"]

2. Kubernetes manifests in /k8s:

deployment-backend.yaml:
- Replicas: 3 (auto-scale 1-10)
- Resource limits: CPU 500m, Memory 512Mi
- Liveness probe: /health
- Readiness probe: /health
- Environment variables from ConfigMap/Secret
- Volume mounts for logs (optional)

deployment-frontend.yaml:
- Replicas: 2
- Nginx reverse proxy + static site
- Resource limits: CPU 200m, Memory 256Mi

service-backend.yaml:
- Type: ClusterIP
- Port: 3000

service-frontend.yaml:
- Type: LoadBalancer or Ingress
- Port: 80, 443

ingress.yaml:
- HTTPS termination (cert-manager)
- Path routing: /* → frontend, /api/* → backend
- Rate limiting annotations
- CORS headers

configmap.yaml:
- API_URL: production URL
- LOG_LEVEL: info
- TELEGRAM_API_ID, TELEGRAM_API_HASH

secret.yaml (create manually):
- JWT_SECRET: base64 encoded
- MONGO_URI: base64 encoded
- DB_PASSWORD: base64 encoded

3. Helm chart (/helm):

Chart.yaml, values.yaml, templates/

Enables one-command deployment:
helm install telegram-drive ./helm -f values-prod.yaml

4. Observability manifests:

prometheus-servicemonitor.yaml (if using Prometheus)
cloudwatch-datasource.yaml (AWS CloudWatch)

5. Database StatefulSet (optional):

mongodb-statefulset.yaml (or use managed MongoDB Atlas)

Commands to deploy:

# Build images
docker build -t gcr.io/project/telegram-drive-backend:1.0 ./backend
docker push gcr.io/project/telegram-drive-backend:1.0

# Create cluster (example: GKE)
gcloud container clusters create telegram-drive --zone=us-central1-a

# Get credentials
gcloud container clusters get-credentials telegram-drive

# Create namespaces
kubectl create namespace telegram-drive
kubectl create namespace telegam-drive-monitoring

# Create secrets
kubectl -n telegram-drive create secret generic telegram-drive-secrets \\
  --from-literal=JWT_SECRET=$(openssl rand -base64 32) \\
  --from-literal=MONGO_URI=mongodb+srv://... \\
  --from-file=/path/.env

# Create ConfigMap
kubectl -n telegram-drive create configmap telegram-drive-config \\
  --from-literal=API_URL=https://yourdomain.com/api \\
  --from-literal=LOG_LEVEL=info

# Apply manifests
kubectl apply -f k8s/

# Or use Helm
helm install telegram-drive ./helm \\
  -n telegram-drive \\
  -f helm/values-prod.yaml

# Verify deployment
kubectl -n telegram-drive get pods
kubectl -n telegram-drive logs deployment/telegram-drive-backend

# Port forward for testing
kubectl -n telegram-drive port-forward service/telegram-drive-backend 3000:3000

6. CI/CD Pipeline (.github/workflows/deploy.yml)

on:
  push:
    branches: [main]
    paths: ['backend/**', 'Dockerfile*']

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: google-auth-action@v1
        with:
          credentials_json: ${{ secrets.GKE_SA_KEY }}
      - run: gcloud auth configure-docker gcr.io
      - run: docker build -t gcr.io/$GCP_PROJECT/telegram-drive-backend:$GITHUB_SHA ./backend
      - run: docker push gcr.io/$GCP_PROJECT/telegram-drive-backend:$GITHUB_SHA
      - run: gcloud container clusters get-credentials telegram-drive
      - run: kubectl set image deployment/telegram-drive-backend \\
              backend=gcr.io/$GCP_PROJECT/telegram-drive-backend:$GITHUB_SHA

7. Monitoring setup:

- Prometheus for metrics
- Grafana dashboards
- Alert rules for errors, latency, CPU
- Sentry for error tracking
- CloudWatch/Stackdriver logs
- APM (Application Performance Monitoring)

8. Backup & Disaster Recovery:

- MongoDB Atlas automated backups
- Velero for K8s cluster backups
- Cross-region replication
- RTO/RPO targets defined

Deliverables:
1. Multi-stage Dockerfiles
2. K8s manifests (Deployment, Service, Ingress, ConfigMap, Secret)
3. Helm chart
4. CI/CD workflow
5. Monitoring configuration
6. Terraform IaC (optional, for GKE/EKS)
7. Runbook for common operations
```

---

## 9. Performance & Scalability Optimization

**Use case**: Handle 10k+ concurrent users and 100TB+ data.

```
Optimize Telegram Drive for scale:

Frontend optimizations:
1. Code splitting by route (Vite auto-splits)
2. Lazy load components: FilePreview, SettingsPage
3. Virtual scroll for file lists (react-window)
4. IndexedDB cache for folder listings
5. Service worker for offline preview cache
6. Image thumbnail lazy loading

Backend optimizations:
1. Database indexing:
   - db.files.createIndex({ ownerId: 1, folderId: 1, createdAt: -1 })
   - db.files.createIndex({ ownerId: 1 })
   - db.shares.createIndex({ token: 1 })
   - db.uploads.createIndex({ uploadId: 1 })
   - Full-text index for search: db.files.createIndex({ name: "text" })

2. Caching strategy (Redis):
   - Folder contents (TTL 5min)
   - User preferences (TTL 1h)
   - Share tokens (TTL 7d)
   - File metadata (TTL 1h)

3. Connection pooling:
   - MongoDB: maxPoolSize: 50
   - Redis: maxRetriesPerRequest: null

4. Async processing:
   - Offload Telegram uploads to workers
   - Use background jobs for cleanup (old uploads)
   - Batch operations where possible

5. API optimization:
   - Pagination (default limit: 50, max: 100)
   - Select only needed fields in queries
   - Compression: gzip middleware
   - HTTP/2 push for critical assets

6. Database archiving:
   - Archive old upload sessions (>7 days)
   - Archive old audit logs (>90 days)
   - Sharding on ownerId (if > 1TB)

7. CDN integration:
   - CloudFlare for static assets
   - Cache image thumbnails in CDN
   - Signed URLs for private content

8. Rate limiting enhancements:
   - Per-user upload quota (50GB/month)
   - Per-account concurrent uploads (5 max)
   - Telegram API rate respecting (200 req/min)

9. Monitoring & metrics:
   - Response time p95, p99
   - Error rate per endpoint
   - Database query time distribution
   - Worker queue depth
   - Memory usage trending
   - Requests per second

10. Load testing:
    - Run k6 load tests
    - Simulate 1000+ concurrent users
    - Test file upload under load
    - Monitor bottlenecks

Deliverables:
1. Database indexes SQL/MongoDB script
2. Redis cache layer implementation
3. Code splitting configuration
4. Virtual scroll component
5. Monitoring dashboard (Grafana)
6. Load testing scripts (k6)
7. Performance benchmark report
8. Optimization checklist
```

---

## 10. React Native Mobile App

**Use case**: Use Telegram Drive on iOS/Android.

```
Generate React Native mobile app scaffolding:

Tech stack:
- React Native (Expo for easy setup)
- Zustand (same store as web)
- React Navigation (stack, tab, drawer)
- Expo File System for offline cache
- Same Axios API client

Project structure:

mobile/
├── app/
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── verify-code.tsx
│   ├── (app)/
│   │   ├── files/
│   │   │   ├── index.tsx (file manager)
│   │   │   ├── [id].tsx (folder view)
│   │   │   └── preview/[id].tsx (file preview)
│   │   ├── uploads/
│   │   │   └── index.tsx
│   │   ├── settings/
│   │   │   └── index.tsx
│   │   └── _layout.tsx
│   └── _layout.tsx (root layout)
├── components/
│   ├── FileCard.tsx
│   ├── UploadQueue.tsx
│   ├── FolderBreadcrumb.tsx
│   └── Dialogs.tsx
├── hooks/
│   └── (same as web)
├── store/
│   └── (same Zustand stores)
├── api/
│   └── client.ts (same Axios setup)
├── app.json (Expo config)
├── package.json
└── tsconfig.json

Core Features:

1. Authentication:
   - Phone input screen
   - Code verification
   - Token storage in SecureStore

2. File Manager:
   - Grid/list view toggle
   - Folder navigation with breadcrumbs
   - Pull-to-refresh
   - Long-press context menu

3. Upload:
   - Photo picker (camera roll)
   - File picker (documents)
   - Progress visualization
   - Drag-and-drop (tablet)
   - Chunked upload (same as web)

4. Preview:
   - Image preview with pinch-zoom
   - Video player (native)
   - Audio player (native)
   - PDF preview (react-native-pdf)

5. Share:
   - Share sheet integration
   - Copy link to clipboard
   - Open in other apps

6. Offline support:
   - Cache recent files
   - Sync when online
   - Indicator: online/offline badge

7. Settings:
   - Profile view
   - Theme toggle
   - Download history
   - Logout

UI Components (using React Native):
- FlatList with optimized rendering
- TouchableOpacity for buttons
- Modal for dialogs
- Image with blur placeholder
- ActivityIndicator for loading
- FlatList for virtual scrolling

Dependencies:
{
  "dependencies": {
    "expo": "^50.0.0",
    "react-native": "0.73.0",
    "react-navigation": "^6.1.0",
    "zustand": "^4.4.0",
    "axios": "^1.6.0",
    "expo-file-system": "^15.4.0",
    "expo-media-library": "^15.3.0",
    "expo-secure-store": "^12.3.0",
    "react-native-video": "^5.2.0"
  }
}

Commands:

npx create-expo-app telegram-drive-mobile
npm install expo-router zustand axios
npm start

# Preview in Expo Go app or iOS/Android simulator

Building for production:

# EAS Build (Expo's CI/CD)
eas build -p ios
eas build -p android
eas submit -p ios
eas submit -p android

# Or local build
npx expo prebuild  # Generate native code
npx react-native build-android
npx react-native build-ios

Deliverables:
1. React Native app scaffold with Expo
2. All components converted to React Native
3. Same Zustand store (cross-platform)
4. Same API client (works on native)
5. Native image/video/audio players
6. Offline caching with Expo FileSystem
7. SecureStore integration for tokens
8. Android & iOS icon/splash setup
9. App Store Connect/Google Play config (partial)
10. Build & deploy scripts
```

---

## Quick Access

Use these sections when extending the app:

1. **UI Features**: Prompts #1, 4, 7
2. **Backend Services**: Prompts #2, 5, 6
3. **Advanced Features**: Prompts #3, 8, 9
4. **Mobile**: Prompt #10

---

## How to Use

1. Copy the relevant prompt
2. Paste into your favorite LLM (Claude, ChatGPT, etc)
3. Request code output in specific format if needed
4. Integrate into the project
5. Test locally with `npm run dev`
6. Deploy with Docker or K8s

---

**All prompts tested and production-ready. Customize paths/names as needed for your project structure.**

# Architecture & System Design

## Overview

Telegram Drive is a serverless-ready cloud storage system that leverages Telegram's infrastructure as the backend storage layer. Files are chunked (split into pieces) and stored as documents in a private Telegram channel or Saved Messages, while metadata (folders, sharing info, user data) is stored in MongoDB.

## High-Level Architecture

```
┌─────────────┐
│   Browser   │
│  (React UI) │
└──────┬──────┘
       │ REST API + JWT
       ↓
┌──────────────────────────────────────┐
│       API Gateway / Load Balancer    │
├──────────────────────────────────────┤
│                                      │
│  ┌────────────────────────────────┐  │
│  │  Express API Server            │  │
│  │  - Auth (JWT)                  │  │
│  │  - File operations             │  │
│  │  - Upload management           │  │
│  │  - Share links                 │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  Upload Worker (BullMQ Job)    │  │
│  │  - Chunk to Telegram upload    │  │
│  │  - Retry & rate limiting       │  │
│  │  - Reassembly on download      │  │
│  └────────────────────────────────┘  │
│                                      │
└──────────────────────────────────────┘
       ↓
┌──────────────────────────────────────┐
│       Data Layer                     │
├──────────────────────────────────────┤
│  ┌────────────────────────────────┐  │
│  │  MongoDB                       │  │
│  │  - Users, Folders, Files      │  │
│  │  - Upload Sessions            │  │
│  │  - Share Links & Permissions  │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  Redis (optional)              │  │
│  │  - Cache, Rate limiting       │  │
│  │  - Job queue (BullMQ)         │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  Telegram (Storage)            │  │
│  │  - File chunks as documents   │  │
│  │  - Private channel or       │  │
│  │    Saved Messages           │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

## Component Details

### Frontend (React)
- **Pages**: Auth, FileManager, Preview, Settings
- **Components**: FileCard, DropZone, Dialogs, UploadQueue
- **Hooks**: useAuth, useChunkedUpload, useFileOperations
- **Store (Zustand)**: User auth, files, uploads, breadcrumbs
- **API Client**: Axios with JWT interceptor

**Tech Stack**: React 18, Vite, Tailwind CSS, Zustand, Lucide Icons, react-dropzone

### Backend (Node.js)
- **Auth Service**: Telegram OTP via gramjs, JWT issuance
- **API Service**: Express REST endpoints
- **Upload Worker**: Processes chunks, uploads to Telegram, manages retries
- **Database**: MongoDB for metadata (users, files, folders, shares)
- **Cache**: Redis for rate limiting and job queue

**Tech Stack**: Node.js, Express, Mongoose, gramjs, JWT, BullMQ

### Storage (Telegram)
- Files are split into chunks (default: 5MB each)
- Each chunk is uploaded as a Telegram document
- Telegram returns a `file_id` which uniquely identifies each chunk
- All `file_id`s are stored in MongoDB for reassembly
- Uses user session or bot account for uploads

## Data Models

### User
```javascript
{
  _id: ObjectId,
  telegramId: Number,            // Telegram user ID
  username: String,
  phone: String,
  firstName: String,
  sessionData: String,          // Encrypted gramjs session
  createdAt: Date,
  updatedAt: Date
}
```

### Folder
```javascript
{
  _id: ObjectId,
  ownerId: ObjectId → User,
  name: String,
  parentId: ObjectId → Folder,  // null = root
  path: [ObjectId],             // Ancestor chain for fast queries
  createdAt: Date,
  updatedAt: Date
}
```

### File
```javascript
{
  _id: ObjectId,
  ownerId: ObjectId → User,
  name: String,
  folderId: ObjectId → Folder,
  size: Number,                 // Total file size
  mimeType: String,
  chunks: [
    {
      index: Number,
      size: Number,
      telegramFileId: String,   // Unique ID from Telegram
      uploadedAt: Date
    }
  ],
  encrypted: Boolean,           // Optional
  createdAt: Date,
  updatedAt: Date
}
```

### UploadSession
```javascript
{
  _id: ObjectId,
  ownerId: ObjectId → User,
  uploadId: UUID,               // Client-provided session ID
  fileName: String,
  fileSize: Number,
  chunkCount: Number,
  uploadedChunks: [Number],     // Array of chunk indexes
  folderId: ObjectId,
  status: String,               // 'uploading'|'completed'|'failed'
  createdAt: Date,              // TTL: 24 hours
  updatedAt: Date
}
```

### Share
```javascript
{
  _id: ObjectId,
  fileId: ObjectId → File,
  folderId: ObjectId → Folder,     // either fileId or folderId
  ownerId: ObjectId → User,
  type: String,                    // 'public'|'private'
  token: String,                   // Shareable token (base64url random)
  expiresAt: Date,                 // null = never expires
  permissions: {
    read: Boolean,                 // true
    download: Boolean,             // true
    write: Boolean                 // false (usually)
  },
  allowedUsers: [Number],          // For private shares
  createdAt: Date
}
```

## Upload Flow (Chunked)

```
Client                           API Server                      Telegram
  │                                 │                               │
  ├─ POST /uploads/init ────────────>│                               │
  │  (filename, size, mime)          │                               │
  │<────────────────────────────────│ Create UploadSession           │
  │  {uploadId, chunkSize}           │                               │
  │                                  │                               │
  ├─ Split file into chunks          │                               │
  │                                  │                               │
  ├─ POST /uploads/:id/chunk ──────>│ Save chunk & track index      │
  │  (index, chunk 1)                │                               │
  │  (index, chunk 2)                │ Enqueue upload job             │
  │  ...                             │                               │
  │  (index, chunk N)                │                               │
  │                                  │                               │
  │<──────── 200 OK ──────────────── │                               │
  │                                  │                               │
  ├─ POST /uploads/:id/commit ──────>│ Mark session complete          │
  │                                  ├─────── Upload chunk 1 ───────>│
  │                                  │                               ├─ Store document
  │                                  │<────── file_id_1 ─────────────┤
  │                                  │                               │
  │                                  ├─────── Upload chunk 2 ───────>│
  │<─────── 202 Accepted ────────────┤<────── file_id_2 ─────────────┤
  │                                  │                               │
  │ (async worker processes)         │ Store all file_ids in DB      │
  │                                  │ Mark file.status = 'ready'    │
  │                                  │                               │
  └────────────────────────────────────────────────────────────────┘
```

## Download/Stream Flow

```
Client                           API Server                      Telegram
  │                                 │                               │
  ├─ GET /files/:id/stream ────────>│                               │
  │  (with Range header)             │                               │
  │                                  ├─ Calculate which chunks ─────>│
  │                                  │  intersect Range              │
  │                                  │                               │
  │                                  ├────── Get file chunk 1 ──────>│
  │                                  │<────── bytes 0-5MB ───────────┤
  │<───────── Content-Range ─────────┤                               │
  │<───────── chunk data ────────────┤                               │
  │                                  │ (if Range spans multiple)     │
  │                                  ├────── Get file chunk 2 ──────>│
  │                                  │<────── bytes 5-10MB ──────────┤
  │<───────── Content-Range ─────────┤                               │
  │<───────── chunk data ────────────┤                               │
  │                                  │                               │
  └────────────────────────────────────────────────────────────────┘
```

## Sharing Flow

### Public Share
1. User clicks "Share" on a file
2. API generates a cryptographically random `token` (16 chars base64url)
3. Creates Share record: `{fileId, token, type: 'public', permissions: {read: true, download: true}}`
4. Returns shareable URL: `https://yourdomain.com/s/{token}`
5. Anyone can access via `GET /shares/{token}` (no auth required)

### Private Share
1. User selects "Share Privately" and adds specific Telegram user IDs
2. Creates Share with `type: 'private'` and populated `allowedUsers` array
3. Recipient must be logged in (JWT)
4. API verifies `req.user.telegramId` is in `share.allowedUsers`
5. If yes, serve file; otherwise 403 Forbidden

## Rate Limiting & Quotas

Currently implemented:
- **Global**: 100 requests per 15 minutes per IP
- **Upload**: No current limits (implement as needed)

Future enhancements:
- Per-user upload quota (e.g., 50 GB/month)
- Per-IP concurrent uploads
- Telegram API rate limiting (queue retries)

## Security Considerations

### Authentication
- Telegram OTP for login (leverages Telegram's security)
- JWT tokens (RS256 recommended for production)
- Refresh token rotation

### File Security
- Sanitize file names (prevent path traversal)
- Validate MIME types
- Size limits per file
- Optional client-side encryption (AES-256-GCM)

### Access Control
- All endpoints require JWT except:
  - `POST /auth/telegram/*` (login)
  - `GET /shares/:token` (public shares, if `type === 'public'`)
- Database queries include `ownerId` to prevent cross-user access

### Secrets Management
- JWT secret in `.env`
- Telegram API ID/Hash in `.env`
- Encrypted user sessions stored in DB (encrypt with secret key)

## Scalability

### Horizontal Scaling
- **API Servers**: Stateless, can run behind load balancer
- **Workers**: Run on separate instances, process BullMQ jobs from Redis
- **Database**: MongoDB replica set for HA
- **Caching**: Redis for session cache and rate limiting

### Optimization
- Lazy-load folder contents (pagination)
- Cache folder tree with TTL
- CDN for image thumbnails
- Compress files if applicable
- IndexedDB on client for offline support

### Telegram Rate Limits
- Telegram has API rate limits (~100-200 requests/player/minute)
- Queue uploads to respect limits
- Implement exponential backoff for retries
- Distribute across multiple bot accounts if scale grows

## Monitoring & Observability

Recommended:
- Error tracking (Sentry, LogRocket)
- Performance monitoring (New Relic, DataDog)
- Database monitoring (MongoDB Atlas, Compass)
- Logs aggregation (ELK, Datadog)

## Deployment Tiers

### Tier 1: Development
- Local MongoDB instance
- Local Redis (optional)
- Single backend + frontend process

### Tier 2: Staging
- Docker Compose on single VM
- MongoDB Atlas or managed instance
- Heroku or DigitalOcean App Platform

### Tier 3: Production
- Kubernetes cluster (GKE, EKS, DigitalOcean)
- MongoDB Atlas replica set
- Redis managed instance
- CDN (Cloudflare, AWS CloudFront)
- CI/CD pipeline (GitHub Actions)
- Monitoring & alerting

## Future Enhancements

- [ ] Desktop app (Electron)
- [ ] Mobile app (React Native / Flutter)
- [ ] Collaborative editing (real-time sync)
- [ ] Version control (file history)
- [ ] Advanced permissions (role-based access)
- [ ] Activity logs & audit trail
- [ ] Backup/restore functionality
- [ ] Compression on upload
- [ ] End-to-end encryption
- [ ] S3 backup integration

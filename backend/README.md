# Telegram Drive - Backend

Production-ready Node.js + Express backend with MongoDB, Telegram auth (via gramjs), and file upload management.

## Setup

```bash
cd backend
npm install
```

## Environment Variables

Create `.env`:

```
NODE_ENV=development
PORT=3000
MONGO_URI=mongodb://localhost:27017/telegram-drive
JWT_SECRET=your-super-secret-key-change-in-production
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
FRONTEND_URL=http://localhost:5173
```

## Development

```bash
npm run dev
```

Server runs on `http://localhost:3000`

## Production Build

```bash
npm start
```

## API Endpoints

### Auth
- `POST /api/auth/telegram/request_code` - Request OTP
- `POST /api/auth/telegram/verify_code` - Verify OTP and login
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - Logout

### Files & Folders
- `GET /api/folders/:folderId?` - Get folder contents
- `POST /api/folders` - Create folder
- `PATCH /api/folders/:id` - Rename folder
- `DELETE /api/folders/:id` - Delete folder

### Uploads (chunked)
- `POST /api/uploads/init` - Initialize upload session
- `POST /api/uploads/:uploadId/chunk` - Upload chunk
- `POST /api/uploads/:uploadId/commit` - Finalize upload
- `GET /api/uploads/:uploadId/status` - Get upload status

### Sharing
- `POST /api/shares` - Create share link
- `GET /api/shares/:token` - Resolve share (public)

## Architecture

- `/src/models` - MongoDB schemas (User, File, Folder, Upload, Share)
- `/src/routes` - Express route handlers
- `/src/middleware` - JWT authentication
- `/src/handlers` - Business logic
- `/src/lib` - Utilities (Telegram client wrapper, encryption, etc.)

## Next Steps

1. Configure `/src/lib/telegramClient.js` with real gramjs integration
2. Implement file storage worker (chunks to Telegram)
3. Add rate limiting and security headers
4. Connect with frontend via API proxy

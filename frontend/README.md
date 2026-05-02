# Telegram Drive - Frontend

Complete React + Tailwind UI for cloud storage with Telegram auth.

## Features

- 🔐 Telegram OTP login
- 📁 File manager (Google Drive-like)
- ⬆️ Drag-and-drop uploads (chunked)
- 🔄 Progress tracking
- 🔗 Share links & access control
- 🎨 Modern responsive UI
- 🔍 File search
- 📹 Video/audio streaming ready

## Setup

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173`

## Build

```bash
npm run build
```

## Environment

Create `.env.local` (optional):

```
REACT_APP_API_URL=http://localhost:3000/api
```

## Architecture

- `/src/components` - UI components (Auth, FileManager, Dialogs, etc.)
- `/src/hooks` - Custom hooks (useAuth, useChunkedUpload, useFileOperations)
- `/src/store` - Zustand stores (auth, files, uploads)
- `/src/api` - API client and endpoints
- `/src/styles` - Global CSS and Tailwind

## Production Ready

- Error boundaries
- Loading states
- Toast notifications
- Form validation
- Responsive design
- Accessibility (ARIA labels)
- Performance optimized

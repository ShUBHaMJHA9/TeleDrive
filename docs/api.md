# API Reference

## Base URL
```
http://localhost:3000/api
```

## Authentication
All endpoints (except noted) require JWT in Authorization header:
```
Authorization: Bearer {token}
```

## Error Responses
All errors return JSON with `error` field:
```json
{
  "error": "Error message"
}
```

HTTP Status Codes:
- `200` - OK
- `201` - Created
- `202` - Accepted (async)
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error

---

## Authentication Endpoints

### Request OTP Code
```http
POST /auth/telegram/request_code
Content-Type: application/json

{
  "phone": "+1234567890"
}
```

**Response:**
```json
{
  "message": "Code sent to Telegram",
  "phone": "+1234567890",
  "code": "123456"  // dev mode only
}
```

### Verify Code & Login
```http
POST /auth/telegram/verify_code
Content-Type: application/json

{
  "phone": "+1234567890",
  "code": "123456"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "phone": "+1234567890",
    "firstName": "User"
  }
}
```

### Get Profile
```http
GET /me
Authorization: Bearer {token}
```

**Response:**
```json
{
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "phone": "+1234567890",
    "firstName": "User",
    "username": "username"
  }
}
```

### Refresh Token
```http
POST /auth/refresh
Authorization: Bearer {token}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Logout
```http
POST /auth/logout
Authorization: Bearer {token}
```

**Response:**
```json
{
  "message": "Logged out"
}
```

---

## File & Folder Endpoints

### Get Folder Contents
```http
GET /folders/:folderId
Authorization: Bearer {token}

Query Parameters:
  page: number (default: 1)
  limit: number (default: 50)
```

**Response:**
```json
{
  "folders": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Documents",
      "parentId": null,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "files": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "name": "report.pdf",
      "size": 2048576,
      "mimeType": "application/pdf",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Create Folder
```http
POST /folders
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "New Folder",
  "parentId": null
}
```

**Response:**
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "name": "New Folder",
  "parentId": null,
  "path": [],
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### Rename Folder
```http
PATCH /folders/:folderId
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Renamed Folder"
}
```

**Response:** Same as Create (updated folder)

### Delete Folder
```http
DELETE /folders/:folderId
Authorization: Bearer {token}
```

**Response:**
```json
{
  "message": "Folder deleted"
}
```

---

## Upload Endpoints (Chunked)

### Initialize Upload
```http
POST /uploads/init
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "large-file.zip",
  "size": 104857600,
  "mime": "application/zip",
  "folderId": null,
  "encrypted": false
}
```

**Response:**
```json
{
  "uploadId": "550e8400-e29b-41d4-a716-446655440000",
  "chunkSize": 5242880,
  "chunkCount": 20
}
```

### Upload Chunk
```http
POST /uploads/:uploadId/chunk
Authorization: Bearer {token}
Content-Type: multipart/form-data

form-data:
  index: 0
  data: <binary chunk data>
```

**Response:**
```json
{
  "uploadId": "550e8400-e29b-41d4-a716-446655440000",
  "chunkIndex": 0,
  "message": "Chunk uploaded"
}
```

### Commit Upload
```http
POST /uploads/:uploadId/commit
Authorization: Bearer {token}
```

**Response:**
```json
{
  "fileId": "507f1f77bcf86cd799439014",
  "message": "Upload completed"
}
```

Status will be `202 Accepted` if server is still processing (async).

### Get Upload Status
```http
GET /uploads/:uploadId/status
Authorization: Bearer {token}
```

**Response:**
```json
{
  "uploadId": "550e8400-e29b-41d4-a716-446655440000",
  "fileName": "large-file.zip",
  "progress": 50,
  "uploadedChunks": 10,
  "totalChunks": 20,
  "status": "uploading"
}
```

---

## Download/Stream Endpoints

### Get File Metadata
```http
GET /files/:fileId/metadata
Authorization: Bearer {token}
```

**Response:**
```json
{
  "file": {
    "_id": "507f1f77bcf86cd799439014",
    "name": "video.mp4",
    "size": 524288000,
    "mimeType": "video/mp4",
    "chunks": 100,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Stream File
```http
GET /files/:fileId/stream
Authorization: Bearer {token}

Headers:
  Range: bytes=0-1023  (optional)
```

**Response:**
```
HTTP/1.1 206 Partial Content
Content-Type: video/mp4
Content-Length: 1024
Content-Range: bytes 0-1023/524288000

<binary file data>
```

### Download File
```http
GET /files/:fileId/download?token=share_token
```

Returns full file download with `Content-Disposition: attachment`.

---

## Sharing Endpoints

### Create Share Link
```http
POST /shares
Authorization: Bearer {token}
Content-Type: application/json

{
  "fileId": "507f1f77bcf86cd799439014",
  "type": "public",
  "expiresAt": "2024-02-15T10:30:00Z"
}
```

**Response:**
```json
{
  "token": "a1b2c3d4e5f6g7h8",
  "shareUrl": "https://yourdomain.com/s/a1b2c3d4e5f6g7h8"
}
```

### Resolve Share (Public)
```http
GET /shares/:token

No authorization required
```

**Response:**
```json
{
  "file": {
    "_id": "507f1f77bcf86cd799439014",
    "name": "document.pdf",
    "size": 2048576,
    "mimeType": "application/pdf"
  },
  "permissions": {
    "read": true,
    "download": true,
    "write": false
  }
}
```

### Update Share Permissions
```http
PATCH /shares/:shareId
Authorization: Bearer {token}
Content-Type: application/json

{
  "allowedUsers": [123456789, 987654321],
  "permissions": {
    "read": true,
    "download": true,
    "write": false
  }
}
```

**Response:** Updated share object

---

## Search Endpoint

### Search Files
```http
GET /search
Authorization: Bearer {token}

Query Parameters:
  q: string - search query
  type: 'file' | 'folder'
  mimeType: string - filter by MIME type
  createdAfter: ISO date
  createdBefore: ISO date
  sizeMin: number (bytes)
  sizeMax: number (bytes)
  sortBy: 'name' | 'date' | 'size'
  sortOrder: 'asc' | 'desc'
  page: number
  limit: number
```

**Response:**
```json
{
  "results": [
    {
      "_id": "507f1f77bcf86cd799439014",
      "name": "search result.pdf",
      "type": "file",
      "size": 2048576,
      "path": "/Documents/2024"
    }
  ],
  "total": 42,
  "page": 1,
  "pageSize": 50
}
```

---

## Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## Rate Limiting

All endpoints are rate-limited:
- `100 requests per 15 minutes` per IP

Headers in response:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1705316400
```

If rate limit exceeded: `429 Too Many Requests`

---

## Pagination

Endpoints supporting pagination use:
- `page` (default: 1)
- `limit` (default: 50, max: 100)

Response includes pagination metadata:
```json
{
  "data": [...],
  "page": 1,
  "pageSize": 50,
  "total": 1000,
  "hasNext": true
}
```

---

## Timestamps

All timestamps are ISO 8601:
```
2024-01-15T10:30:00Z
```

---

## WebSocket Events (Future)

For real-time updates:
```
ws://localhost:3000/ws
{
  "type": "upload:progress",
  "uploadId": "...",
  "progress": 50
}
```

---

## File Naming & Validation

- Max filename: 255 characters
- Allowed: alphanumeric, spaces, hyphens, underscores, dots
- Invalid characters are auto-removed
- Case-insensitive uniqueness per folder

## CORS

Configured for `http://localhost:5173` in development.
Update in production to your frontend domain.

import axios from 'axios';

// Detect if running through Codespaces and construct proper API URL
const getAPIBaseURL = () => {
  const envURL = import.meta.env.VITE_API_URL;
  if (envURL) return envURL;
  
  // If running on Codespaces public URL, construct backend URL
  const hostname = window.location.hostname;
  if (hostname.includes('github.dev')) {
    // Replace 5173 with 3000 in the URL
    const backendURL = window.location.protocol + '//' + hostname.replace('-5173.', '-3000.');
    return backendURL + '/api';
  }
  
  return 'http://localhost:3000/api';
};

const API = axios.create({
  baseURL: getAPIBaseURL(),
  timeout: 10000, // 10 second timeout
});

// Attach token to all requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth endpoints
export const authAPI = {
  requestCode: (phone) => API.post('/auth/telegram/request_code', { phone }),
  verifyCode: (phone, code) => API.post('/auth/telegram/verify_code', { phone, code }),
  refresh: () => API.post('/auth/refresh'),
};

// File endpoints
export const fileAPI = {
  getFolderContents: (folderId = 'root', page = 1) =>
    API.get(`/folders/${folderId}`, { params: { page, limit: 50 } }),
  createFolder: (name, parentId = null) =>
    API.post('/folders', { name, parentId }),
  renameFile: (fileId, name) =>
    API.patch(`/files/${fileId}`, { name }),
  renameFolder: (folderId, name) =>
    API.patch(`/folders/${folderId}`, { name }),
  deleteFile: (fileId) =>
    API.delete(`/files/${fileId}`),
  deleteFolder: (folderId) =>
    API.delete(`/folders/${folderId}`),
  moveFile: (fileId, targetFolderId) =>
    API.patch(`/files/${fileId}`, { folderId: targetFolderId }),
  moveFolder: (folderId, targetFolderId) =>
    API.patch(`/folders/${folderId}`, { parentId: targetFolderId }),
  searchFiles: (query) =>
    API.get('/search', { params: { q: query } }),
};

// Upload endpoints
export const uploadAPI = {
  initUpload: (fileName, fileSize, mimeType, folderId) =>
    API.post('/uploads/init', {
      name: fileName,
      size: fileSize,
      mime: mimeType,
      folderId,
      encrypted: false,
    }),
  uploadChunk: (uploadId, chunkIndex, chunkData) => {
    const formData = new FormData();
    formData.append('index', chunkIndex);
    formData.append('data', chunkData);
    return API.post(`/uploads/${uploadId}/chunk`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  commitUpload: (uploadId) =>
    API.post(`/uploads/${uploadId}/commit`),
  getUploadStatus: (uploadId) =>
    API.get(`/uploads/${uploadId}/status`),
};

// Share endpoints
export const shareAPI = {
  createShare: (fileId, type = 'public', expiresAt = null) =>
    API.post('/shares', { fileId, type, expiresAt }),
  getShare: (token) =>
    API.get(`/shares/${token}`),
  updateShareAccess: (shareId, allowedUsers) =>
    API.patch(`/shares/${shareId}`, { allowedUsers }),
};

// User endpoints
export const userAPI = {
  getProfile: () => API.get('/me'),
  logout: () => API.post('/logout'),
};

export default API;

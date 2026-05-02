import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,

  setUser: (user) => set({ user }),
  setToken: (token) => {
    localStorage.setItem('token', token);
    set({ token, isAuthenticated: !!token });
  },
  setLoading: (loading) => set({ loading }),
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
  },
}));

export const useFileStore = create((set, get) => ({
  files: [],
  folders: [],
  currentFolderId: null,
  selectedFiles: [],
  breadcrumbs: [{ id: 'root', name: 'Drive' }],

  setFiles: (files) => set({ files }),
  setFolders: (folders) => set({ folders }),
  setCurrentFolderId: (folderId) => set({ currentFolderId: folderId }),
  addFile: (file) => set((state) => ({ files: [...state.files, file] })),
  addFolder: (folder) => set((state) => ({ folders: [...state.folders, folder] })),
  deleteFile: (fileId) =>
    set((state) => ({ files: state.files.filter((f) => f._id !== fileId) })),
  deleteFolder: (folderId) =>
    set((state) => ({ folders: state.folders.filter((f) => f._id !== folderId) })),
  updateBreadcrumbs: (breadcrumbs) => set({ breadcrumbs }),
  toggleFileSelection: (fileId) =>
    set((state) => {
      const selected = state.selectedFiles.includes(fileId)
        ? state.selectedFiles.filter((id) => id !== fileId)
        : [...state.selectedFiles, fileId];
      return { selectedFiles: selected };
    }),
  clearSelection: () => set({ selectedFiles: [] }),
}));

export const useUploadStore = create((set) => ({
  uploads: {}, // { uploadId: { fileName, progress, status, totalSize, uploadedSize } }
  addUpload: (uploadId, fileName, totalSize) =>
    set((state) => ({
      uploads: {
        ...state.uploads,
        [uploadId]: { fileName, progress: 0, status: 'uploading', totalSize, uploadedSize: 0 },
      },
    })),
  updateUpload: (uploadId, progress, uploadedSize) =>
    set((state) => ({
      uploads: {
        ...state.uploads,
        [uploadId]: {
          ...state.uploads[uploadId],
          progress,
          uploadedSize,
        },
      },
    })),
  completeUpload: (uploadId) =>
    set((state) => ({
      uploads: {
        ...state.uploads,
        [uploadId]: { ...state.uploads[uploadId], status: 'completed', progress: 100 },
      },
    })),
  failUpload: (uploadId, error) =>
    set((state) => ({
      uploads: {
        ...state.uploads,
        [uploadId]: { ...state.uploads[uploadId], status: 'failed', error },
      },
    })),
  removeUpload: (uploadId) =>
    set((state) => {
      const { [uploadId]: _, ...rest } = state.uploads;
      return { uploads: rest };
    }),
}));

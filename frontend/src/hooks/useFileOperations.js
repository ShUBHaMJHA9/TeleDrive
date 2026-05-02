import { useState, useCallback } from 'react';
import { useFileStore } from '../store';
import { fileAPI } from '../api/client';
import toast from 'react-hot-toast';

export const useFileOperations = () => {
  const { setFiles, setFolders, addFolder, deleteFile, deleteFolder, addFile } = useFileStore();
  const [loading, setLoading] = useState(false);

  const createFolder = useCallback(
    async (name, parentId = null) => {
      try {
        setLoading(true);
        const res = await fileAPI.createFolder(name, parentId);
        addFolder(res.data);
        toast.success('Folder created!');
        return res.data;
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to create folder');
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [addFolder]
  );

  const renameFile = useCallback(
    async (fileId, newName) => {
      try {
        setLoading(true);
        await fileAPI.renameFile(fileId, newName);
        toast.success('File renamed!');
      } catch (error) {
        toast.error('Failed to rename file');
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const renameFolder = useCallback(
    async (folderId, newName) => {
      try {
        setLoading(true);
        await fileAPI.renameFolder(folderId, newName);
        toast.success('Folder renamed!');
      } catch (error) {
        toast.error('Failed to rename folder');
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const removeFile = useCallback(
    async (fileId) => {
      try {
        setLoading(true);
        await fileAPI.deleteFile(fileId);
        deleteFile(fileId);
        toast.success('File deleted!');
      } catch (error) {
        toast.error('Failed to delete file');
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [deleteFile]
  );

  const removeFolder = useCallback(
    async (folderId) => {
      try {
        setLoading(true);
        await fileAPI.deleteFolder(folderId);
        deleteFolder(folderId);
        toast.success('Folder deleted!');
      } catch (error) {
        toast.error('Failed to delete folder');
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [deleteFolder]
  );

  return {
    createFolder,
    renameFile,
    renameFolder,
    removeFile,
    removeFolder,
    loading,
  };
};

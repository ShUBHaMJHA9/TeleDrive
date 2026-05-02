import { useState, useCallback } from 'react';
import { useUploadStore } from '../store';
import { uploadAPI, fileAPI } from '../api/client';
import toast from 'react-hot-toast';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

// Simple UUID v4 generator
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export const useChunkedUpload = () => {
  const { addUpload, updateUpload, completeUpload, failUpload } = useUploadStore();
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = useCallback(
    async (file, folderId = null) => {
      const uploadId = uuidv4();
      const chunks = Math.ceil(file.size / CHUNK_SIZE);

      try {
        setIsUploading(true);
        addUpload(uploadId, file.name, file.size);

        // Step 1: Initialize upload session
        const initRes = await uploadAPI.initUpload(file.name, file.size, file.type, folderId);
        const { uploadId: serverUploadId } = initRes.data;

        // Step 2: Upload chunks
        for (let i = 0; i < chunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end);

          await uploadAPI.uploadChunk(serverUploadId, i, chunk);

          const progress = Math.round(((i + 1) / chunks) * 100);
          const uploadedSize = end;
          updateUpload(uploadId, progress, uploadedSize);
        }

        // Step 3: Commit upload (server reassembles chunks and uploads to Telegram)
        await uploadAPI.commitUpload(serverUploadId);
        completeUpload(uploadId);
        toast.success(`${file.name} uploaded successfully!`);
        
        return { uploadId: serverUploadId, success: true };
      } catch (error) {
        failUpload(uploadId, error.message);
        toast.error(`Failed to upload ${file.name}`);
        throw error;
      } finally {
        setIsUploading(false);
      }
    },
    [addUpload, updateUpload, completeUpload, failUpload]
  );

  return { uploadFile, isUploading };
};

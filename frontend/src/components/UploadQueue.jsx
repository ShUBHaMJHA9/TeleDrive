import React from 'react';
import { useUploadStore } from '../store';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const UploadQueue = () => {
  const uploads = useUploadStore((state) => state.uploads);
  const removeUpload = useUploadStore((state) => state.removeUpload);

  if (Object.keys(uploads).length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 w-96 max-w-full space-y-2 z-40">
      {Object.entries(uploads).map(([id, upload]) => (
        <div key={id} className="card p-4 shadow-lg">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {upload.fileName}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(upload.uploadedSize)} / {formatFileSize(upload.totalSize)}
              </p>
            </div>
            <button
              onClick={() => removeUpload(id)}
              className="ml-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all ${
                upload.status === 'completed'
                  ? 'bg-green-500'
                  : upload.status === 'failed'
                  ? 'bg-red-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${upload.progress}%` }}
            />
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 mt-2">
            {upload.status === 'completed' && (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-xs text-green-600">Completed</span>
              </>
            )}
            {upload.status === 'failed' && (
              <>
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-xs text-red-600">{upload.error || 'Failed'}</span>
              </>
            )}
            {upload.status === 'uploading' && (
              <span className="text-xs text-gray-600">{upload.progress}%</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default UploadQueue;

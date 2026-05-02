import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Cloud } from 'lucide-react';

const DropZone = ({ onDrop, isUploading }) => {
  const handleDrop = useCallback(
    (acceptedFiles) => {
      acceptedFiles.forEach((file) => onDrop(file));
    },
    [onDrop]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    disabled: isUploading,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center transition cursor-pointer ${
        isDragActive
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400'
      } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input {...getInputProps()} disabled={isUploading} />
      <Cloud className="w-12 h-12 text-gray-400 mx-auto mb-2" />
      <p className="text-gray-700 font-medium">
        {isDragActive ? 'Drop files here' : 'Drag and drop files here'}
      </p>
      <p className="text-sm text-gray-500 mt-1">or click to select files</p>
    </div>
  );
};

export default DropZone;

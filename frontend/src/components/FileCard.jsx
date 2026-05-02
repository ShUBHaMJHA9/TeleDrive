import React from 'react';
import { Folder, File, Image, FileText, Music, Video, Download, Trash2, Share2, MoreVertical } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const getFileIcon = (mimeType, isFolder = false) => {
  if (isFolder) return <Folder className="w-8 h-8 text-blue-500" />;

  if (mimeType?.startsWith('image/')) return <Image className="w-8 h-8 text-green-500" />;
  if (mimeType?.startsWith('audio/')) return <Music className="w-8 h-8 text-purple-500" />;
  if (mimeType?.startsWith('video/')) return <Video className="w-8 h-8 text-red-500" />;
  if (mimeType?.includes('pdf')) return <FileText className="w-8 h-8 text-orange-500" />;

  return <File className="w-8 h-8 text-gray-400" />;
};

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const FileCard = ({ file, isFolder = false, onRename, onDelete, onShare, onOpen }) => {
  const [showMenu, setShowMenu] = React.useState(false);

  return (
    <div
      onClick={onOpen}
      className="group card p-4 hover:shadow-md transition cursor-pointer relative"
    >
      <div className="flex flex-col h-full">
        {/* Icon */}
        <div className="flex justify-center mb-3">
          {getFileIcon(file.mimeType, isFolder)}
        </div>

        {/* Name */}
        <h3 className="text-sm font-medium text-gray-900 text-center truncate group-hover:text-blue-600">
          {file.name}
        </h3>

        {/* Metadata */}
        <p className="text-xs text-gray-500 mt-1 text-center">
          {!isFolder && formatFileSize(file.size)}
        </p>
        <p className="text-xs text-gray-400 mt-0.5 text-center">
          {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
        </p>

        {/* Actions */}
        <div className="mt-auto pt-2 flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
            className="btn-icon text-sm"
            title="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="btn-icon text-sm hover:bg-red-100"
            title="Delete"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileCard;

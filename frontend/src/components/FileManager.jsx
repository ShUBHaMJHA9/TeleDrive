import React, { useState, useEffect } from 'react';
import { useFileStore } from '../store';
import { useFileOperations, useChunkedUpload } from '../hooks';
import { fileAPI, shareAPI } from '../api/client';
import { Plus, Grid3X3, List, LogOut, Settings, Search } from 'lucide-react';
import FileCard from './FileCard';
import Breadcrumb from './Breadcrumb';
import DropZone from './DropZone';
import UploadQueue from './UploadQueue';
import {
  CreateFolderDialog,
  RenameDialog,
  DeleteConfirmDialog,
  ShareDialog,
} from './Dialogs';
import toast from 'react-hot-toast';

const FileManager = ({ onLogout }) => {
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Dialogs state
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [shareLink, setShareLink] = useState('');

  // Store
  const { files, folders, currentFolderId, setFiles, setFolders, setCurrentFolderId } = useFileStore();
  const { createFolder, renameFile, removeFile, loading: fileOpLoading } = useFileOperations();
  const { uploadFile, isUploading } = useChunkedUpload();

  // Load folder contents
  useEffect(() => {
    const loadContents = async () => {
      try {
        setLoading(true);
        const res = await fileAPI.getFolderContents(currentFolderId);
        setFiles(res.data.files || []);
        setFolders(res.data.folders || []);
      } catch (error) {
        toast.error('Failed to load files');
      } finally {
        setLoading(false);
      }
    };
    loadContents();
  }, [currentFolderId, setFiles, setFolders]);

  // Handlers
  const handleUpload = async (file) => {
    try {
      await uploadFile(file, currentFolderId);
      // Refresh folder contents
      const res = await fileAPI.getFolderContents(currentFolderId);
      setFiles(res.data.files || []);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleCreateFolder = async (name) => {
    try {
      await createFolder(name, currentFolderId);
      setShowCreateFolder(false);
      // Refresh
      const res = await fileAPI.getFolderContents(currentFolderId);
      setFolders(res.data.folders || []);
    } catch (error) {
      console.error('Create folder failed:', error);
    }
  };

  const handleRename = async (newName) => {
    if (!selectedItem) return;
    try {
      if (selectedItem.type === 'file') {
        await renameFile(selectedItem._id, newName);
        setFiles(
          files.map((f) => (f._id === selectedItem._id ? { ...f, name: newName } : f))
        );
      }
      setShowRename(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Rename failed:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    try {
      if (selectedItem.type === 'file') {
        await removeFile(selectedItem._id);
      }
      setShowDelete(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleShare = async () => {
    if (!selectedItem) return;
    try {
      const res = await shareAPI.createShare(selectedItem._id, 'public');
      setShareLink(
        `${window.location.origin}/s/${res.data.token}`
      );
      setShowShare(true);
    } catch (error) {
      toast.error('Failed to create share link');
    }
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast.success('Link copied to clipboard!');
  };

  const openFile = (file) => {
    // TODO: Implement file preview
    console.log('Open file:', file);
  };

  const openFolder = (folder) => {
    setCurrentFolderId(folder._id);
  };

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-blue-600">📱 Telegram Drive</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button className="btn-icon hidden sm:flex">
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={onLogout}
              className="btn-icon hidden sm:flex hover:bg-red-100"
              title="Logout"
            >
              <LogOut className="w-5 h-5 text-red-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <Breadcrumb currentFolderId={currentFolderId} onNavigate={setCurrentFolderId} />

      {/* Top Action Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateFolder(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            New Folder
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`btn-icon ${viewMode === 'grid' ? 'bg-gray-200' : ''}`}
          >
            <Grid3X3 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`btn-icon ${viewMode === 'list' ? 'bg-gray-200' : ''}`}
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          {/* Drop Zone */}
          <DropZone onDrop={handleUpload} isUploading={isUploading} />

          {/* Files Grid */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : filteredFolders.length === 0 && filteredFiles.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No files or folders</p>
            </div>
          ) : (
            <div
              className={`grid gap-4 ${
                viewMode === 'grid'
                  ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
                  : 'grid-cols-1'
              }`}
            >
              {/* Folders */}
              {filteredFolders.map((folder) => (
                <FileCard
                  key={folder._id}
                  file={folder}
                  isFolder
                  onOpen={() => openFolder(folder)}
                  onDelete={() => {
                    setSelectedItem({ _id: folder._id, name: folder.name, type: 'folder' });
                    setShowDelete(true);
                  }}
                  onRename={() => {
                    setSelectedItem({ _id: folder._id, name: folder.name, type: 'folder' });
                    setShowRename(true);
                  }}
                  onShare={() => handleShare()}
                />
              ))}
              {/* Files */}
              {filteredFiles.map((file) => (
                <FileCard
                  key={file._id}
                  file={file}
                  onOpen={() => openFile(file)}
                  onDelete={() => {
                    setSelectedItem({ _id: file._id, name: file.name, type: 'file' });
                    setShowDelete(true);
                  }}
                  onRename={() => {
                    setSelectedItem({ _id: file._id, name: file.name, type: 'file' });
                    setShowRename(true);
                  }}
                  onShare={() => {
                    setSelectedItem({ _id: file._id, name: file.name, type: 'file' });
                    handleShare();
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Dialogs */}
      <CreateFolderDialog
        isOpen={showCreateFolder}
        onClose={() => setShowCreateFolder(false)}
        onCreate={handleCreateFolder}
      />
      <RenameDialog
        isOpen={showRename}
        onClose={() => setShowRename(false)}
        initialName={selectedItem?.name || ''}
        onRename={handleRename}
      />
      <DeleteConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        itemName={selectedItem?.name || ''}
        onDelete={handleDelete}
      />
      <ShareDialog
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        shareLink={shareLink}
        onCopy={handleCopyShareLink}
      />

      {/* Upload Queue */}
      <UploadQueue />
    </div>
  );
};

export default FileManager;

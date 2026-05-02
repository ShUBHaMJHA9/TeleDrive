import React, { useState } from 'react';
import { useFileStore, useAuthStore } from '../store';
import { useFileOperations } from '../hooks';
import { 
  Upload, LogOut, Search, Grid3x3, List, 
  Folder, File, Share2, Trash2, MoreVertical,
  Home, Cloud
} from 'lucide-react';
import { Toaster } from 'react-hot-toast';

const PremiumFileManager = ({ onLogout }) => {
  const { user } = useAuthStore();
  const { files, loading } = useFileStore();
  
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen bg-white flex">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200 flex items-center gap-3">
          <img src="/logo.png" alt="TeleDrive" className="w-10 h-10" />
          <h1 className="text-xl font-bold text-gray-900">TeleDrive</h1>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {[
            { icon: Home, label: 'Home', active: true },
            { icon: Share2, label: 'Shared' },
            { icon: Trash2, label: 'Trash' },
          ].map((item, i) => (
            <button
              key={i}
              className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition ${
                item.active
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <item.icon className="w-4 h-4" strokeWidth={2} />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Storage */}
        <div className="p-4 border-t border-gray-200 space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-gray-600">
              <span>Storage</span>
              <span>7.5 GB / 100 GB</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full w-1/2 bg-blue-500 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* User */}
        <div className="p-4 border-t border-gray-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <p className="font-medium text-gray-900">{user?.phone || 'User'}</p>
              <p className="text-xs text-gray-500">Free plan</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Topbar */}
        <div className="border-b border-gray-200 bg-white px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" strokeWidth={2} />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded transition ${
                  viewMode === 'grid'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Grid3x3 className="w-4 h-4" strokeWidth={2} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition ${
                  viewMode === 'list'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>

            {/* Upload */}
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition">
              <Upload className="w-4 h-4" strokeWidth={2} />
              Upload
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-8 text-sm text-gray-600">
              <Home className="w-4 h-4" />
              <span className="text-gray-900 font-medium">My Files</span>
            </div>

            {/* Files */}
            {loading ? (
              <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-2'}`}>
                {[...Array(8)].map((_, i) => (
                  <div key={i} className={`${viewMode === 'grid' ? 'h-48' : 'h-12'} bg-gray-100 rounded-lg animate-pulse`}></div>
                ))}
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center">
                <Cloud className="w-16 h-16 text-gray-300 mb-4" strokeWidth={1} />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No files yet</h3>
                <p className="text-gray-600 mb-6">Upload your first file to get started</p>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition">
                  <Upload className="w-4 h-4" />
                  Upload File
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredFiles.map((file, i) => (
                  <div key={i} className="group bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-gray-300 transition cursor-pointer">
                    <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                      {file.type === 'folder' ? (
                        <Folder className="w-10 h-10 text-blue-400" strokeWidth={1.5} />
                      ) : (
                        <File className="w-10 h-10 text-gray-400" strokeWidth={1.5} />
                      )}
                    </div>
                    <h4 className="font-medium text-gray-900 text-sm truncate">{file.name}</h4>
                    <p className="text-xs text-gray-500 mt-1">{file.size || 'Folder'}</p>
                    <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition">
                      <button className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition">
                        <Share2 className="w-3 h-3" />
                      </button>
                      <button className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition">
                        <MoreVertical className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredFiles.map((file, i) => (
                  <div key={i} className="group bg-white border border-gray-200 rounded-lg px-4 py-3 hover:bg-gray-50 hover:border-gray-300 transition flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {file.type === 'folder' ? (
                        <Folder className="w-4 h-4 text-blue-400 flex-shrink-0" strokeWidth={2} />
                      ) : (
                        <File className="w-4 h-4 text-gray-400 flex-shrink-0" strokeWidth={2} />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">{file.size || 'Folder'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button className="p-2 text-gray-600 hover:bg-gray-100 rounded transition">
                        <Share2 className="w-4 h-4" strokeWidth={2} />
                      </button>
                      <button className="p-2 text-gray-600 hover:bg-gray-100 rounded transition">
                        <MoreVertical className="w-4 h-4" strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Toaster position="bottom-right" />
    </div>
  );
};

export default PremiumFileManager;


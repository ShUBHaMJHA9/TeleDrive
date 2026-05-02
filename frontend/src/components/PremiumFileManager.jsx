import React, { useState, useEffect, useRef } from 'react';
import { useFileStore, useAuthStore } from '../store';
import { useFileOperations, useChunkedUpload } from '../hooks';
import { fileAPI, shareAPI, authAPI, userAPI, uploadAPI } from '../api/client';
import { 
  Upload, LogOut, Search, Grid3x3, List, 
  Folder, File as FileIcon, Share2, Trash2, MoreVertical,
  Home, Cloud, FolderPlus, Download, Edit2, X, Plus, FilePlus, RefreshCcw, Link as LinkIcon,
  ChevronLeft, ChevronRight, ArrowDownAZ, ArrowUpZA, Calendar, HardDrive, Menu,
  Play, Pause, Volume2, VolumeX, Maximize,
  FileText, Image as ImageIcon, Video, Music, FileCode, Archive, Database,
  Clock, Star, CheckCircle2, AlertCircle, XCircle, ChevronDown, Settings, Zap, Users, Check, Terminal, Lock
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';

const CustomVideoPlayer = ({ src, title }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeout = useRef(null);

  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(controlsTimeout.current);
      controlsTimeout.current = setTimeout(() => setShowControls(false), 2500);
    };
    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const togglePlay = (e) => {
    e.stopPropagation();
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
    setProgress(progress || 0);
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = (e) => {
    e.stopPropagation();
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleSeek = (e) => {
    e.stopPropagation();
    if (!videoRef.current || !isFinite(videoRef.current.duration)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickedValue = (x / rect.width) * videoRef.current.duration;
    if (isFinite(clickedValue)) {
      videoRef.current.currentTime = clickedValue;
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center bg-transparent group" onClick={togglePlay}>
      <video
        ref={videoRef}
        src={src}
        autoPlay
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        className="max-w-full max-h-full object-contain outline-none shadow-2xl"
        style={{ maxHeight: isFullscreen ? '100vh' : '85vh' }}
      />
      
      {/* Controls Overlay */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pt-20 pb-6 px-8 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full h-1.5 bg-white/20 rounded-full mb-6 cursor-pointer relative hover:h-2 transition-all" onClick={handleSeek}>
          <div className="absolute top-0 left-0 h-full bg-blue-500 rounded-full" style={{ width: `${progress}%` }}></div>
          <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow" style={{ left: `${progress}%`, marginLeft: '-6px' }}></div>
        </div>
        
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-6">
            <button onClick={togglePlay} className="hover:text-blue-400 transition transform hover:scale-110">
              {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7" />}
            </button>
            <button onClick={toggleMute} className="hover:text-blue-400 transition transform hover:scale-110">
              {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
            </button>
            <div className="h-4 w-px bg-white/20 mx-2"></div>
            <span className="text-[15px] font-medium opacity-90 truncate max-w-sm">{title}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <button onClick={toggleFullscreen} className="hover:text-blue-400 transition transform hover:scale-110">
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const PremiumFileManager = ({ onLogout }) => {
  const { user } = useAuthStore();
  const { 
    currentFolderId, setCurrentFolderId, 
    files, folders, setFiles, setFolders,
    breadcrumbs, updateBreadcrumbs 
  } = useFileStore();
  
  const { 
    createFolder, removeFile, removeFolder, renameFile, renameFolder,
    trashFile, trashFolder, restoreFile, restoreFolder
  } = useFileOperations();
  
  const { uploadFile, isUploading } = useChunkedUpload();
  
  const [currentTab, setCurrentTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'files';
  });
  
  const [currentPage, setCurrentPage] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return parseInt(params.get('page')) || 1;
  });

  const [isPollingImports, setIsPollingImports] = useState(false);

  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [shareLink, setShareLink] = useState(null);
  const [showShareSettings, setShowShareSettings] = useState(null);
  const [showShareModal, setShowShareModal] = useState(null); // { item, shareUrl }
  const [isCreatingShare, setIsCreatingShare] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderNameInput, setFolderNameInput] = useState('New Folder');
  const [showFileModal, setShowFileModal] = useState(false);
  const [fileNameInput, setFileNameInput] = useState('New Document.txt');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importUrlInput, setImportUrlInput] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showApiModal, setShowApiModal] = useState(false);
  const [apiKey, setApiKey] = useState(user?.developerApiKey || '');
  const [textContent, setTextContent] = useState('');
  const [isSavingText, setIsSavingText] = useState(false);
  const [clipboard, setClipboard] = useState(null); // { action: 'cut'|'copy', item: {} }
  const [showInfoModal, setShowInfoModal] = useState(null);
  const [showRenameModal, setShowRenameModal] = useState(null);
  const [renameInput, setRenameInput] = useState('');
  const [storageData, setStorageData] = useState({ used: 0, limit: null });
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [showCompressModal, setShowCompressModal] = useState(null);
  const [zipNameInput, setZipNameInput] = useState('Archive.zip');
  const [showExtractModal, setShowExtractModal] = useState(null);
  const [extractFolderInput, setExtractFolderInput] = useState('');
  const [contextMenu, setContextMenu] = useState(null); // { x, y, item }
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [uploadQueue, setUploadQueue] = useState([]); // [{ id, name, progress, speed, status, controller }]
  const [showUploadsPanel, setShowUploadsPanel] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]); // Array of IDs
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [folderType, setFolderType] = useState('personal'); // 'personal', 'channel', 'group'
  const [pagination, setPagination] = useState({ totalFiles: 0, totalPages: 1 });

  // Senior Performance Optimization: Sync State to URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (currentTab) params.set('tab', currentTab);
    if (currentFolderId) params.set('folder', currentFolderId);
    else params.delete('folder');
    if (currentPage > 1) params.set('page', currentPage);
    else params.delete('page');
    
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [currentTab, currentFolderId, currentPage]);

  // Initial URL Read
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlFolder = params.get('folder');
    if (urlFolder && urlFolder !== currentFolderId) {
      setCurrentFolderId(urlFolder);
    }
  }, []);

  const allItems = [
    ...folders.map(f => ({ ...f, isFolder: true, type: 'folder' })),
    ...files.map(f => ({ ...f, isFolder: false, type: f.mimeType }))
  ];

  const itemsToDisplay = allItems
    .filter(item => {
      if (!searchQuery) return true;
      return item.name.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      // Always keep folders first
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;

      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'date') {
        const dateA = new Date(a.updatedAt || a.createdAt).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt).getTime();
        comparison = dateA - dateB;
      } else if (sortBy === 'size') {
        comparison = (a.size || 0) - (b.size || 0);
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Polling for background imports
  useEffect(() => {
    let intervalId;
    const pollingItems = uploadQueue.filter(u => u.isImport && u.status === 'uploading');
    
    if (pollingItems.length > 0) {
      intervalId = setInterval(async () => {
        for (const item of pollingItems) {
          try {
            const res = await uploadAPI.getUploadStatus(item.id);
            const { status, progress, fileName } = res.data;
            
            setUploadQueue(prev => prev.map(up => {
              if (up.id === item.id) {
                let newProgress = progress || up.progress;
                let speedText = up.speed;
                
                if (status === 'downloading') {
                  speedText = 'Downloading...';
                  newProgress = 15; // Mock progress for download phase
                } else if (status === 'uploading') {
                  speedText = 'Uploading to Telegram...';
                } else if (status === 'completed') {
                  speedText = 'Imported';
                  newProgress = 100;
                  fetchContents();
                } else if (status === 'failed') {
                  speedText = 'Failed';
                }
                
                return { 
                  ...up, 
                  status: (status === 'completed' || status === 'failed') ? status : 'uploading',
                  progress: newProgress,
                  speed: speedText
                };
              }
              return up;
            }));
          } catch (err) {
            console.error("Polling error:", err);
          }
        }
      }, 2000);
    }
    
    return () => clearInterval(intervalId);
  }, [uploadQueue]);
  const [shareSettings, setShareSettings] = useState({ type: 'public', password: '', expiresAt: '' });
  
  const fileInputRef = useRef(null);
  const thumbInputRef = useRef(null);
  const [thumbTarget, setThumbTarget] = useState(null);
  const [showMembersModal, setShowMembersModal] = useState(null);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const getFileIcon = (item, size = "w-8 h-8", isGrid = false) => {
    if (item.isFolder || item.folderType) {
      if (['channel', 'group'].includes(item.folderType) && item._id) {
        return (
          <div className={`${isGrid ? 'w-full h-full' : size} ${isGrid ? '' : 'rounded-xl'} overflow-hidden flex-shrink-0 bg-gray-50 flex items-center justify-center`}>
            <img 
              src={`http://localhost:3000/api/files/folders/${item._id}/icon?token=${localStorage.getItem('token')}`} 
              className="w-full h-full object-cover"
              alt=""
              loading="lazy"
              onError={(e) => {
                e.target.onerror = null;
                e.target.style.display = 'none';
                // Show fallback icon
                const parent = e.target.parentElement;
                parent.innerHTML = '';
                const svgContainer = document.createElement('div');
                svgContainer.className = 'w-full h-full flex items-center justify-center ' + (item.folderType === 'channel' ? 'bg-emerald-50' : 'bg-orange-50');
                
                if (item.folderType === 'channel') {
                    svgContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-2/3 h-2/3 text-emerald-500"><path d="M4 14.5 12 3l1 10.5h7L12 21l-1-10.5H4Z"/></svg>`;
                } else {
                    svgContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-2/3 h-2/3 text-orange-500"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
                }
                parent.appendChild(svgContainer);
              }}
            />
          </div>
        );
      }
      if (item.folderType === 'channel') return <Zap className={`${size} text-emerald-500`} fill="#d1fae5" />;
      if (item.folderType === 'group') return <Users className={`${size} text-orange-500`} fill="#ffedd5" />;
      return <Folder className={`${size} text-blue-500 drop-shadow-sm`} fill="#bfdbfe" />;
    }
    
    const name = item.name.toLowerCase();
    const type = (item.mimeType || item.type || '').toLowerCase();

    if (name.endsWith('.pdf')) return <FileText className={`${size} text-red-500`} fill="#fee2e2" />;
    if (type.startsWith('image/')) return <ImageIcon className={`${size} text-emerald-500`} fill="#d1fae5" />;
    if (type.startsWith('video/') || name.endsWith('.mkv') || name.endsWith('.mp4') || name.endsWith('.avi')) return <Video className={`${size} text-purple-500`} fill="#f3e8ff" />;
    if (type.startsWith('audio/') || name.endsWith('.mp3') || name.endsWith('.wav')) return <Music className={`${size} text-pink-500`} fill="#fce7f3" />;
    if (/\.(js|jsx|ts|tsx|html|css|json|py|java|cpp|c|sh|php)$/i.test(name)) return <FileCode className={`${size} text-orange-500`} fill="#ffedd5" />;
    if (/\.(zip|rar|7z|tar|gz)$/i.test(name)) return <Archive className={`${size} text-amber-500`} fill="#fef3c7" />;
    if (/\.(csv|xlsx|xls|ods)$/i.test(name)) return <Database className={`${size} text-blue-400`} fill="#dbeafe" />;
    if (name.endsWith('.txt') || name.endsWith('.md')) return <FileText className={`${size} text-gray-500`} fill="#f3f4f6" />;
    
    return <FileIcon className={`${size} text-gray-400`} />;
  };

  const fetchContents = async () => {
    setLoading(true);
    try {
      const meRes = await userAPI.getProfile();
      setStorageData(meRes.data.storage);
      
      // Update account list
      const savedAccounts = JSON.parse(localStorage.getItem('td_accounts') || '[]');
      const currentAccount = { token: localStorage.getItem('token'), user: meRes.data.user };
      
      const exists = savedAccounts.findIndex(acc => acc.user._id === currentAccount.user._id);
      if (exists === -1) {
        savedAccounts.push(currentAccount);
      } else {
        savedAccounts[exists] = currentAccount;
      }
      localStorage.setItem('td_accounts', JSON.stringify(savedAccounts));
      setAccounts(savedAccounts);

      let res;
      if (currentFolderId) {
        res = await fileAPI.getFolderContents(currentFolderId, currentPage);
      } else if (currentTab === 'trash') {
        res = await fileAPI.getTrashContents();
      } else if (currentTab === 'starred') {
        res = await fileAPI.getStarredContents();
      } else if (currentTab === 'recent') {
        res = await fileAPI.getRecentContents();
      } else if (currentTab === 'channels') {
        res = await fileAPI.getFoldersByType('channel');
      } else if (currentTab === 'groups') {
        res = await fileAPI.getFoldersByType('group');
      } else {
        res = await fileAPI.getFolderContents('root', currentPage);
      }
      setFiles(res.data.files || []);
      setFolders(res.data.folders || []);
      if (res.data.pagination) {
        setPagination(res.data.pagination);
      } else {
        setPagination({ totalFiles: (res.data.files?.length || 0), totalPages: 1 });
      }
    } catch (err) {
      console.error("Failed to load contents", err);
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const switchAccount = (account) => {
    localStorage.setItem('token', account.token);
    window.location.reload();
  };

  const addAccount = () => {
    const savedAccounts = JSON.parse(localStorage.getItem('td_accounts') || '[]');
    // The current account is already in savedAccounts from fetchContents
    // Just clear active token to force login
    localStorage.removeItem('token');
    window.location.reload();
  };

  const isImageFile = (f) => f.mimeType?.startsWith('image/') || f.type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|bmp|webp|svg|ico|tiff)$/i.test(f.name);
  const isVideoFile = (f) => f.mimeType?.startsWith('video/') || f.type?.startsWith('video/') || /\.(mp4|webm|mkv|mov|avi|flv|wmv)$/i.test(f.name);
  const isAudioFile = (f) => f.mimeType?.startsWith('audio/') || f.type?.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac)$/i.test(f.name);
  const isPdfFile = (f) => f.mimeType === 'application/pdf' || f.type === 'application/pdf' || f.name?.toLowerCase().endsWith('.pdf');
  const isTextFile = (f) => f.mimeType?.startsWith('text/') || f.type?.startsWith('text/') || /\.(csv|json|md|js|jsx|ts|tsx|html|css|txt)$/i.test(f.name);

  const renderFolderTile = (folder, index) => (
    <div 
      key={folder._id} 
      onDoubleClick={() => handleDoubleClick(folder)}
      onContextMenu={(e) => handleContextMenu(e, folder)}
      className="group relative bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer select-none flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="w-full aspect-square bg-gray-50 rounded-xl mb-4 flex items-center justify-center group-hover:bg-blue-50/50 transition-colors overflow-hidden relative">
        {getFileIcon(folder, "w-14 h-14", true)}
        {folder.folderType === 'channel' && <Zap className="absolute top-2 right-2 w-4 h-4 text-blue-500 opacity-50" />}
        {folder.folderType === 'group' && <Users className="absolute top-2 right-2 w-4 h-4 text-purple-500 opacity-50" />}
      </div>
      <h4 className="w-full font-semibold text-gray-900 text-[14px] truncate">{folder.name}</h4>
      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div 
          className={`w-5 h-5 rounded-lg border flex items-center justify-center ${selectedItems.includes(folder._id) ? 'bg-blue-600 border-blue-600' : 'bg-white/90 border-gray-300'}`}
          onClick={(e) => toggleSelection(e, folder._id)}
        >
          {selectedItems.includes(folder._id) && <Check className="w-3 h-3 text-white stroke-[3]" />}
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    fetchContents();
  }, [currentFolderId, currentTab, currentPage, setFiles, setFolders]);

  useEffect(() => {
    setCurrentPage(1);
  }, [currentFolderId, currentTab]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!previewFile) return;
      
      const previewableItems = itemsToDisplay.filter(item => !item.isFolder);
      const currentIndex = previewableItems.findIndex(item => item._id === previewFile._id);
      
      if (currentIndex === -1) return;

      if (e.key === 'ArrowRight') {
        const nextIndex = (currentIndex + 1) % previewableItems.length;
        setPreviewFile(previewableItems[nextIndex]);
      } else if (e.key === 'ArrowLeft') {
        const prevIndex = (currentIndex - 1 + previewableItems.length) % previewableItems.length;
        setPreviewFile(previewableItems[prevIndex]);
      } else if (e.key === 'Escape') {
        setPreviewFile(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewFile, files, searchResults, folders]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fileAPI.searchFiles(searchQuery);
        setSearchResults([
          ...(res.data.folders || []).map(f => ({ ...f, isFolder: true, type: 'folder' })),
          ...(res.data.files || []).map(f => ({ ...f, isFolder: false, type: f.mimeType }))
        ]);
      } catch (err) {
        toast.error("Search failed");
      } finally {
        setLoading(false);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const submitExtract = async () => {
    if (!extractFolderInput.trim()) return;
    const item = showExtractModal;
    setShowExtractModal(null);
    toast.loading("Extracting files...", { id: 'zip-task' });
    try {
      await fileAPI.extractFile(item._id, extractFolderInput.trim());
      toast.success("Extraction complete!", { id: 'zip-task' });
      fetchContents();
    } catch (err) {
      toast.error("Extraction failed: " + (err.response?.data?.error || err.message), { id: 'zip-task' });
    }
  };

  const handleContextMenu = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveMenu(null); // Close any active dot menus
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  };

  const submitCreateFolder = async () => {
    if (folderNameInput && folderNameInput.trim()) {
      try {
        if (folderType === 'personal') {
          await fileAPI.createFolder(folderNameInput.trim(), currentFolderId === 'root' ? null : currentFolderId);
        } else {
          await fileAPI.createChatFolder(folderNameInput.trim(), folderType, currentFolderId === 'root' ? null : currentFolderId);
        }
        setShowFolderModal(false);
        setFolderType('personal'); // Reset
        fetchContents();
        toast.success(`${folderType.charAt(0).toUpperCase() + folderType.slice(1)} folder created!`);
      } catch (err) {
        toast.error("Failed to create folder");
      }
    }
  };

  const submitCompress = async () => {
    if (!zipNameInput.trim()) return;
    const item = showCompressModal;
    setShowCompressModal(null);
    toast.loading("Compressing files...", { id: 'zip-task' });
    try {
      await fileAPI.compressFiles([item._id], zipNameInput, currentFolderId === 'root' ? null : currentFolderId);
      toast.success("Compression complete!", { id: 'zip-task' });
      fetchContents();
    } catch (err) {
      toast.error("Compression failed: " + (err.response?.data?.error || err.message), { id: 'zip-task' });
    }
  };

  const submitCreateFile = async () => {
    if (fileNameInput && fileNameInput.trim()) {
      const emptyFile = new File([""], fileNameInput.trim(), { type: "text/plain" });
      await uploadFile(emptyFile, currentFolderId === 'root' ? null : currentFolderId);
      setShowFileModal(false);
      fetchContents();
    }
  };

  const submitImportUrl = async () => {
    if (importUrlInput && importUrlInput.trim()) {
      // Basic sanitization: extract the first part if user pasted junk
      const rawInput = importUrlInput.trim();
      const url = rawInput.split(/\s+/)[0];
      
      if (!url.startsWith('http')) {
        return toast.error("Please enter a valid URL starting with http/https");
      }

      if (rawInput.length > url.length) {
        toast.error("Invalid characters detected in URL. Using the first part.");
      }

      const fileName = url.split('/').pop().split('?')[0] || 'Imported File';
      const uploadId = Math.random().toString(36).substring(7);
      
      const newUpload = { 
        id: uploadId, 
        name: fileName, 
        progress: 10, 
        speed: 'Connecting...', 
        status: 'uploading',
        cancel: false,
        isImport: true
      };
      
      setUploadQueue(prev => [newUpload, ...prev]);
      setShowUploadsPanel(true);
      setShowImportModal(false);
      setImportUrlInput('');

      try {
        await uploadAPI.importUrl(url, currentFolderId === 'root' ? null : currentFolderId);
        setUploadQueue(prev => prev.map(up => 
          up.id === uploadId ? { ...up, status: 'completed', progress: 100, speed: 'Imported' } : up
        ));
        toast.success(`Imported: ${fileName}`);
        fetchContents();
      } catch (err) {
        setUploadQueue(prev => prev.map(up => 
          up.id === uploadId ? { ...up, status: 'failed', speed: 'Failed' } : up
        ));
        const errorMsg = err.response?.data?.error || err.message || "Failed to import file.";
        toast.error(errorMsg);
      }
    }
  };

  const submitDelete = async () => {
    if (!showDeleteModal) return;
    const item = showDeleteModal;
    setShowDeleteModal(null);
    try {
      if (item.isFolder) await removeFolder(item._id);
      else await removeFile(item._id);
      fetchContents();
      toast.success("Permanently deleted");
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  const submitSetPassword = async () => {
    if (passwordInput.length < 6) return toast.error("Password must be at least 6 characters");
    try {
      await authAPI.setPassword(passwordInput);
      toast.success("Password set successfully!");
      setShowPasswordModal(false);
      setPasswordInput('');
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to set password");
    }
  };

  const generateNewApiKey = async () => {
    try {
      const res = await authAPI.generateApiKey();
      setApiKey(res.data.apiKey);
      toast.success("API Key generated!");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to generate API Key");
    }
  };

  useEffect(() => {
    if (previewFile && isTextFile(previewFile)) {
      setTextContent('Loading content...');
      fetch(fileAPI.getStreamUrl(previewFile._id))
        .then(res => res.text())
        .then(text => setTextContent(text))
        .catch(() => setTextContent('Error loading text file.'));
    }
  }, [previewFile]);

  const handleFileUpload = (e) => {
    const selectedFiles = Array.from(e.target.files);
    handleUploadFiles(selectedFiles);
  };

  const handleUploadFiles = async (selectedFiles) => {
    if (!selectedFiles.length) return;
    
    setShowUploadsPanel(true);
    
    for (const file of selectedFiles) {
      const uploadId = Math.random().toString(36).substring(7);
      const newUpload = { 
        id: uploadId, 
        name: file.name, 
        progress: 0, 
        speed: '0 KB/s', 
        status: 'uploading',
        cancel: false
      };
      
      setUploadQueue(prev => [newUpload, ...prev]);
      
      try {
        const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        
        const initRes = await uploadAPI.initUpload(
          file.name, 
          file.size, 
          file.type, 
          currentFolderId === 'root' ? null : currentFolderId
        );
        
        const serverUploadId = initRes.data.uploadId;
        let uploadedBytes = 0;
        let startTime = Date.now();
        
        for (let i = 0; i < totalChunks; i++) {
          // Check if cancelled
          let isCancelled = false;
          setUploadQueue(prev => {
            const up = prev.find(u => u.id === uploadId);
            if (up?.cancel) isCancelled = true;
            return prev;
          });
          if (isCancelled) break;

          const start = i * CHUNK_SIZE;
          const end = Math.min(file.size, start + CHUNK_SIZE);
          const chunk = file.slice(start, end);
          
          await uploadAPI.uploadChunk(serverUploadId, i, chunk);
          
          uploadedBytes += (end - start);
          const progress = Math.round((uploadedBytes / file.size) * 100);
          const elapsed = (Date.now() - startTime) / 1000;
          const speed = (uploadedBytes / 1024 / elapsed).toFixed(1);
          
          setUploadQueue(prev => prev.map(up => 
            up.id === uploadId ? { ...up, progress, speed: speed > 1024 ? (speed/1024).toFixed(1) + ' MB/s' : speed + ' KB/s' } : up
          ));
        }
        
        await uploadAPI.commitUpload(serverUploadId);
        setUploadQueue(prev => prev.map(up => 
          up.id === uploadId ? { ...up, status: 'completed', progress: 100 } : up
        ));
        fetchContents();
      } catch (err) {
        setUploadQueue(prev => prev.map(up => 
          up.id === uploadId ? { ...up, status: 'failed' } : up
        ));
        toast.error(`Upload failed: ${file.name}`);
      }
    }
  };

  const cancelUpload = (id) => {
    setUploadQueue(prev => prev.map(up => 
      up.id === id ? { ...up, cancel: true, status: 'cancelled' } : up
    ));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const selectedFiles = Array.from(e.dataTransfer.files);
    handleUploadFiles(selectedFiles);
  };

  const handleDoubleClick = (item) => {
    if (currentTab === 'trash') {
      toast.error("Restore item to open it.");
      return;
    }
    if (item.isFolder || item.folderType) {
      setCurrentFolderId(item._id);
      updateBreadcrumbs([...breadcrumbs, { id: item._id, name: item.name }]);
    } else {
      setPreviewFile(item);
    }
  };

  const handleBreadcrumbClick = (bc, index) => {
    setCurrentFolderId(bc.id === 'root' ? null : bc.id);
    updateBreadcrumbs(breadcrumbs.slice(0, index + 1));
  };

  const handleAction = async (action, item, e) => {
    e.stopPropagation();
    setActiveMenu(null);
    
    if (action === 'trash') {
      if (item.isFolder) await trashFolder(item._id);
      else await trashFile(item._id);
      fetchContents();
    } else if (action === 'restore') {
      if (item.isFolder) await restoreFolder(item._id);
      else await restoreFile(item._id);
      fetchContents();
    } else if (action === 'delete') {
      setShowDeleteModal(item);
    } else if (action === 'star') {
      try {
        if (item.isFolder) await fileAPI.starFolder(item._id, !item.isStarred);
        else await fileAPI.starFile(item._id, !item.isStarred);
        toast.success(item.isStarred ? "Removed from Starred" : "Added to Starred");
        fetchContents();
      } catch (err) {
        toast.error("Action failed");
      }
    } else if (action === 'rename') {
      setRenameInput(item.name);
      setShowRenameModal(item);
    } else if (action === 'share') {
      setIsCreatingShare(true);
      try {
        const payload = item.isFolder || item.folderType
          ? { folderId: item._id, type: 'public' }
          : { fileId: item._id, type: 'public' };
        const res = await shareAPI.createShare(payload);
        setShowShareModal({ item, shareUrl: res.data.shareUrl });
      } catch (err) {
        toast.error('Failed to create share link: ' + (err.response?.data?.error || err.message));
      } finally {
        setIsCreatingShare(false);
      }
    } else if (action === 'info') {
      setShowInfoModal(item);
    } else if (action === 'cut' || action === 'copy') {
      setClipboard({ action, item });
      toast.success(`${item.name} copied to clipboard (ready to ${action}).`);
    } else if (action === 'extract') {
      setExtractFolderInput(item.name.split('.')[0]);
      setShowExtractModal(item);
    } else if (action === 'compress') {
      setZipNameInput(item.name.split('.')[0] + '.zip');
      setShowCompressModal(item);
    } else if (action === 'download') {
      const url = `http://localhost:3000/api/files/${item._id}/download?token=${localStorage.getItem('token') || ''}`;
      window.open(url, '_blank');
    } else if (action === 'thumbnail') {
      setThumbTarget(item);
      thumbInputRef.current?.click();
    }
  };

  const toggleSelection = (e, itemId) => {
    e.stopPropagation();
    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  const handleBulkAction = async (action) => {
    const items = selectedItems.map(id => {
      const item = allItems.find(i => i._id === id);
      return item;
    }).filter(Boolean);

    try {
      toast.loading(`Processing ${items.length} items...`, { id: 'bulk' });
      
      for (const item of items) {
        if (action === 'star') {
          if (item.isFolder) await fileAPI.starFolder(item._id, !item.isStarred);
          else await fileAPI.starFile(item._id, !item.isStarred);
        } else if (action === 'trash') {
          if (item.isFolder) await fileAPI.trashFolder(item._id);
          else await fileAPI.trashFile(item._id);
        }
      }
      
      toast.success(`${items.length} items updated!`, { id: 'bulk' });
      setSelectedItems([]);
      fetchContents();
    } catch (err) {
      toast.error("Bulk action failed", { id: 'bulk' });
    }
  };

  const selectAll = () => {
    if (selectedItems.length === itemsToDisplay.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(itemsToDisplay.map(i => i._id));
    }
  };

  const fetchMembers = async (folder) => {
    setShowMembersModal(folder);
    setLoadingMembers(true);
    setMembers([]);
    try {
      const res = await userAPI.getFolderMembers(folder._id);
      setMembers(res.data.members);
    } catch (err) {
      toast.error("Failed to fetch members");
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleThumbChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !thumbTarget) return;

    const formData = new FormData();
    formData.append('thumbnail', file);

    try {
      toast.loading("Uploading thumbnail...", { id: 'thumb' });
      await fileAPI.setThumbnail(thumbTarget._id, formData);
      toast.success("Thumbnail updated!", { id: 'thumb' });
      fetchContents();
    } catch (err) {
      toast.error("Thumbnail upload failed", { id: 'thumb' });
    }
    e.target.value = null;
  };

  const handlePaste = async () => {
    if (!clipboard) return;
    try {
      if (clipboard.action === 'cut') {
        if (clipboard.item.isFolder) {
          await fileAPI.moveFolder(clipboard.item._id, currentFolderId === 'root' ? null : currentFolderId);
        } else {
          await fileAPI.moveFile(clipboard.item._id, currentFolderId === 'root' ? null : currentFolderId);
        }
        toast.success(`Moved ${clipboard.item.name}`);
        setClipboard(null); // Clear clipboard after cut-paste
      } else if (clipboard.action === 'copy') {
        if (clipboard.item.isFolder) {
          await fileAPI.copyFolder(clipboard.item._id, currentFolderId === 'root' ? null : currentFolderId);
        } else {
          await fileAPI.copyFile(clipboard.item._id, currentFolderId === 'root' ? null : currentFolderId);
        }
        toast.success(`Copied ${clipboard.item.name}`);
      }
      fetchContents();
    } catch (err) {
      toast.error("Paste failed: " + (err.response?.data?.error || err.message));
    }
  };

  const submitRename = async () => {
    if (!renameInput.trim() || renameInput === showRenameModal.name) {
      setShowRenameModal(null);
      return;
    }
    try {
      if (showRenameModal.isFolder) await fileAPI.renameFolder(showRenameModal._id, renameInput);
      else await fileAPI.renameFile(showRenameModal._id, renameInput);
      fetchContents();
      setShowRenameModal(null);
      toast.success("Renamed successfully");
    } catch (err) {
      toast.error("Rename failed");
    }
  };

  const handleSaveText = async () => {
    if (!previewFile) return;
    setIsSavingText(true);
    try {
      await fileAPI.saveFileContent(previewFile._id, textContent);
      toast.success("File saved successfully!");
      fetchContents();
    } catch (error) {
      toast.error("Failed to save file: " + (error.response?.data?.error || error.message));
    } finally {
      setIsSavingText(false);
    }
  };


  return (
    <div className="h-screen bg-white flex overflow-hidden">
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 md:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 w-64 border-r border-gray-200 bg-gray-50 flex flex-col flex-shrink-0 transition-transform duration-300 ease-in-out`}>
        <div className="p-6 border-b border-gray-200 flex items-center gap-3">
          <img src="/logo.png" alt="TeleDrive" className="w-10 h-10" />
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">TeleDrive</h1>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {[
            { id: 'files', icon: Home, label: 'My Files' },
            { id: 'channels', icon: Zap, label: 'Channels' },
            { id: 'groups', icon: Users, label: 'Groups' },
            { id: 'recent', icon: Clock, label: 'Recent' },
            { id: 'starred', icon: Star, label: 'Starred' },
            { id: 'trash', icon: Trash2, label: 'Trash' },
            { id: 'settings', icon: Edit2, label: 'Settings' },
            { id: 'docs', icon: Terminal, label: 'API Docs' },
          ].map((item, i) => (
            <button
              key={item.id}
              onClick={() => { 
                setCurrentTab(item.id); 
                setCurrentFolderId(null); 
                updateBreadcrumbs([{ 
                  id: 'root', 
                  name: item.id === 'channels' ? 'Channels' : 
                        item.id === 'groups' ? 'Groups' : 
                        item.id === 'trash' ? 'Trash' : 
                        item.id === 'starred' ? 'Starred' : 
                        item.id === 'recent' ? 'Recent' : 'My Drive' 
                }]); 
                setMobileMenuOpen(false); 
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium transition-all ${
                currentTab === item.id
                  ? 'bg-blue-50/80 text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <item.icon className="w-5 h-5" strokeWidth={2} />
              {item.label}
            </button>
          ))}

          <div className="pt-6 mt-6 border-t border-gray-200">
            <div className="px-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Storage</span>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Unlimited</span>
              </div>
              <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-blue-600 rounded-full" 
                  style={{ width: `${Math.min(100, (storageData.used / (1024 * 1024 * 1024 * 10)) * 100)}%` }}
                ></div>
              </div>
              <p className="text-[11px] text-gray-500 font-medium">
                { (storageData.used / 1024 / 1024 / 1024).toFixed(2) } GB used
              </p>
            </div>
          </div>
        </nav>

        {/* User & Accounts */}
        <div className="p-4 border-t border-gray-200 bg-white relative">
          {showAccountMenu && (
            <>
              <div className="fixed inset-0 z-[60]" onClick={() => setShowAccountMenu(false)}></div>
              <div className="absolute bottom-full left-4 right-4 mb-2 bg-white border border-gray-100 rounded-2xl shadow-2xl py-2 z-[70] animate-in fade-in slide-in-from-bottom-2 duration-200 max-h-64 overflow-y-auto">
                <div className="px-4 py-2 border-b border-gray-50 flex justify-between items-center">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Accounts</p>
                  <button onClick={addAccount} className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {accounts.map((acc) => (
                  <button 
                    key={acc.user._id}
                    onClick={() => switchAccount(acc)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-[13px] hover:bg-gray-50 transition-colors ${acc.user._id === user._id ? 'bg-blue-50/50' : ''}`}
                  >
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 font-bold text-xs">
                      {acc.user.firstName?.charAt(0)}
                    </div>
                    <div className="text-left flex-1 truncate">
                      <p className="font-semibold text-gray-900 truncate">{acc.user.firstName}</p>
                      <p className="text-[10px] text-gray-500">{acc.user.phone}</p>
                    </div>
                    {acc.user._id === user._id && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowAccountMenu(!showAccountMenu)}
              className="flex-1 flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-all border border-transparent"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm">
                {user?.firstName?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-bold text-[14px] text-gray-900 truncate leading-tight">{user?.firstName}</p>
                <p className="text-[11px] text-gray-500 truncate">{user?.phone}</p>
              </div>
              <ArrowUpZA className={`w-4 h-4 text-gray-400 transition-transform ${showAccountMenu ? '' : 'rotate-180'}`} />
            </button>
            <button 
              onClick={onLogout}
              className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
              title="Logout session"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div 
        className={`flex-1 flex flex-col bg-white relative ${isDragging ? 'bg-blue-50/50' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-blue-500/10 backdrop-blur-sm border-4 border-dashed border-blue-500 rounded-2xl m-4 pointer-events-none">
            <div className="text-center">
              <Upload className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-bounce" />
              <h2 className="text-2xl font-bold text-blue-700">Drop files to upload</h2>
            </div>
          </div>
        )}

        {/* Bulk Actions Toolbar */}
        {selectedItems.length > 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[80] bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 animate-in slide-in-from-top-4 duration-300">
            <span className="text-sm font-bold border-r border-white/20 pr-6">{selectedItems.length} selected</span>
            <div className="flex items-center gap-4">
              <button onClick={() => handleBulkAction('star')} className="flex items-center gap-2 hover:text-blue-400 transition">
                <Star className="w-4 h-4" /> <span className="text-[13px] font-medium">Star</span>
              </button>
              <button onClick={() => handleBulkAction('trash')} className="flex items-center gap-2 hover:text-red-400 transition">
                <Trash2 className="w-4 h-4" /> <span className="text-[13px] font-medium">Trash</span>
              </button>
              <button onClick={() => setSelectedItems([])} className="ml-4 p-1 hover:bg-white/10 rounded-lg transition">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Topbar */}
        <div className="border-b border-gray-200 bg-white px-4 md:px-8 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="w-full flex items-center gap-3 md:flex-1 md:max-w-xl">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="relative group flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 md:py-3 bg-gray-50 hover:bg-gray-100 border-transparent rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-[15px]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-4 w-full md:w-auto pb-1 md:pb-0">
            {['files', 'recent', 'starred', 'trash'].includes(currentTab) && (
              <div className="flex items-center gap-2">
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-gray-100 border-none text-sm text-gray-700 rounded-lg py-2 pl-3 pr-8 focus:ring-0 cursor-pointer"
                >
                  <option value="name">Name</option>
                  <option value="date">Date Modified</option>
                  <option value="size">Size</option>
                </select>
                <button 
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-2 text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {sortOrder === 'asc' ? <ArrowDownAZ className="w-4 h-4" /> : <ArrowUpZA className="w-4 h-4" />}
                </button>
              </div>
            )}

            {['files', 'channels', 'groups'].includes(currentTab) && (
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  <Grid3x3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            )}

            {['files', 'channels', 'groups'].includes(currentTab) && (
              <div className="flex items-center gap-3 relative">
                {clipboard && (
                  <button 
                    onClick={handlePaste} 
                    className="flex items-center gap-2 px-5 py-2.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-xl font-medium text-[15px] shadow-sm hover:shadow transition-all whitespace-nowrap animate-in fade-in zoom-in-95"
                  >
                    <List className="w-5 h-5" />
                    Paste ({clipboard.action})
                  </button>
                )}
                {['channels', 'groups'].includes(currentTab) && !currentFolderId && (
                  <button 
                    onClick={async () => {
                      toast.loading("Syncing with Telegram...", { id: 'sync' });
                      try {
                        await fileAPI.syncChannels();
                        toast.success("Sync complete!", { id: 'sync' });
                        fetchContents();
                      } catch (err) {
                        toast.error("Sync failed: " + (err.response?.data?.error || err.message), { id: 'sync' });
                      }
                    }}
                    className="group relative flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-bold text-[15px] shadow-[0_8px_20px_rgba(16,185,129,0.3)] hover:shadow-[0_12px_25px_rgba(16,185,129,0.4)] hover:-translate-y-0.5 transition-all overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <RefreshCcw className="w-5 h-5 animate-hover-spin" />
                    <span className="relative z-10">Sync from Telegram</span>
                  </button>
                )}
                <button 
                  onClick={() => setShowCreateMenu(!showCreateMenu)}
                  disabled={isUploading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white rounded-xl font-medium text-[15px] shadow-sm hover:shadow transition-all"
                >
                  <Plus className="w-5 h-5" />
                  {isUploading ? 'Uploading...' : 'New'}
                </button>
                
                {showCreateMenu && !isUploading && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowCreateMenu(false)}></div>
                    <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-100 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <button 
                        onClick={() => { setShowCreateMenu(false); setFolderNameInput('New Folder'); setShowFolderModal(true); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-gray-700 hover:bg-gray-50"
                      >
                        <FolderPlus className="w-5 h-5 text-gray-400" /> New Folder
                      </button>
                      <button 
                        onClick={() => { setShowCreateMenu(false); setShowImportModal(true); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-gray-700 hover:bg-gray-50"
                      >
                        <LinkIcon className="w-5 h-5 text-gray-400" /> Import from Link
                      </button>
                      <button 
                        onClick={() => { setShowCreateMenu(false); setFileNameInput('New Document.txt'); setShowFileModal(true); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-gray-700 hover:bg-gray-50"
                      >
                        <FilePlus className="w-5 h-5 text-gray-400" /> New Text File
                      </button>
                      <div className="h-px bg-gray-100 my-1"></div>
                      <button 
                        onClick={() => { setShowCreateMenu(false); setFolderNameInput('New Channel'); setFolderType('channel'); setShowFolderModal(true); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-emerald-600 hover:bg-emerald-50 font-medium"
                      >
                        <Zap className="w-5 h-5" /> New Channel Folder
                      </button>
                      <button 
                        onClick={() => { setShowCreateMenu(false); setFolderNameInput('New Group'); setFolderType('group'); setShowFolderModal(true); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-orange-600 hover:bg-orange-50 font-medium"
                      >
                        <Users className="w-5 h-5" /> New Group Folder
                      </button>
                      <div className="h-px bg-gray-100 my-1"></div>
                      <button 
                        onClick={() => { setShowCreateMenu(false); fileInputRef.current?.click(); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-gray-700 hover:bg-gray-50"
                      >
                        <Upload className="w-5 h-5 text-gray-400" /> File Upload
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
            <input 
              type="file" 
              multiple 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-white" onClick={() => setActiveMenu(null)}>
          <div className="p-8">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 mb-8 text-[15px]">
              {breadcrumbs.map((bc, index) => (
                <React.Fragment key={bc.id}>
                  <button 
                    onClick={() => handleBreadcrumbClick(bc, index)}
                    className={`hover:bg-gray-100 px-2 py-1 rounded transition-colors ${index === breadcrumbs.length - 1 ? 'font-semibold text-gray-900' : 'text-gray-500'}`}
                  >
                    {bc.name}
                  </button>
                  {index < breadcrumbs.length - 1 && <span className="text-gray-400">/</span>}
                </React.Fragment>
              ))}
            </div>

            {currentTab === 'settings' ? (
              <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-10">
                  <h2 className="text-2xl font-bold text-gray-900 mb-8">Account Settings</h2>
                  
                  {/* Security Section */}
                  <div className="mb-12">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
                        <Edit2 className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Security & Password</h3>
                        <p className="text-sm text-gray-500">Set a password to skip Telegram OTP requests.</p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 ml-0 md:ml-12">
                      <div className="flex flex-col md:flex-row gap-3 max-w-lg">
                        <input 
                          type="password" 
                          placeholder="Enter new password (min 6 chars)" 
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-[15px]"
                        />
                        <button 
                          onClick={submitSetPassword}
                          className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-xl transition shadow-sm whitespace-nowrap"
                        >
                          Save Password
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* API Section */}
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                        <Cloud className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Developer API</h3>
                        <p className="text-sm text-gray-500">Programmatic access to your drive.</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-200 shadow-sm ml-0 md:ml-12 mb-10">
                      <label className="block text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">Your Secret API Key</label>
                      <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex-1 relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Cloud className="w-5 h-5 text-gray-400" />
                          </div>
                          <input 
                            type="text" 
                            readOnly
                            value={apiKey || 'No API key generated yet'}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[15px] font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              if (apiKey) {
                                navigator.clipboard.writeText(apiKey);
                                toast.success("Copied to clipboard!");
                              }
                            }}
                            disabled={!apiKey}
                            className="px-6 py-3 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 text-gray-800 font-semibold rounded-xl transition shadow-sm flex items-center gap-2"
                          >
                            Copy
                          </button>
                          <button 
                            onClick={generateNewApiKey}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition shadow-sm whitespace-nowrap"
                          >
                            {apiKey ? 'Regenerate Key' : 'Generate Key'}
                          </button>
                        </div>
                      </div>
                      <p className="mt-4 text-[13px] text-gray-500 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                        Keep this key secret. It provides full access to your Drive.
                      </p>
                    </div>

                    {/* Documentation */}
                    <div className="ml-0 md:ml-12 mt-16 max-w-3xl">
                      <div className="mb-8">
                        <h3 className="text-xl font-bold text-gray-900 tracking-tight">API Reference</h3>
                        <p className="text-[15px] text-gray-500 mt-2 leading-relaxed">Integrate TeleDrive directly into your own applications using our REST API. You can securely interact with your files and streams programmatically.</p>
                      </div>
                      
                      <div className="space-y-10">
                        {/* Auth */}
                        <div className="group">
                          <h4 className="text-[16px] font-semibold text-gray-900 mb-3">Authentication</h4>
                          <p className="text-[14.5px] text-gray-600 mb-5 leading-relaxed">
                            Authenticate your requests by passing your API key. You can provide it as a query parameter or via an HTTP header. Keep your key secure and never expose it in client-side code.
                          </p>
                          <div className="bg-gray-50/80 border border-gray-100 rounded-2xl p-5 font-mono text-[13.5px] text-gray-600 shadow-sm">
                            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-4">
                              <span className="text-gray-400 select-none w-16 text-[12px] uppercase tracking-wider font-sans font-semibold">Query</span>
                              <code className="text-blue-700 bg-blue-50/50 border border-blue-100 px-2 py-1 rounded-lg">?apiKey=td_live_xxx</code>
                            </div>
                            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                              <span className="text-gray-400 select-none w-16 text-[12px] uppercase tracking-wider font-sans font-semibold">Header</span>
                              <code className="text-purple-700 bg-purple-50/50 border border-purple-100 px-2 py-1 rounded-lg">x-api-key: td_live_xxx</code>
                            </div>
                          </div>
                        </div>

                        <hr className="border-gray-100" />

                        {/* Endpoints */}
                        <div className="group">
                          <h4 className="text-[16px] font-semibold text-gray-900 mb-5">Endpoints</h4>
                          
                          <div className="space-y-5">
                            {/* Stream */}
                            <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white hover:border-blue-100 transition-colors shadow-sm hover:shadow-md duration-300">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50/50 border-b border-gray-100 gap-4">
                                <div className="flex items-center gap-3">
                                  <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-widest uppercase">GET</span>
                                  <code className="font-mono text-[14px] text-gray-800">/api/files/:fileId/stream</code>
                                </div>
                                <span className="text-[13px] text-gray-500 font-medium">Stream Media</span>
                              </div>
                              <div className="p-5 flex flex-col md:flex-row gap-6">
                                <div className="flex-1">
                                  <p className="text-[14px] text-gray-600 leading-relaxed">Streams video or audio files directly. Supports HTTP range requests for seamless seeking in external media players.</p>
                                </div>
                                <div className="w-px bg-gray-100 hidden md:block"></div>
                                <div className="md:w-48 flex-shrink-0">
                                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Responses</p>
                                  <div className="space-y-2.5">
                                    <div className="flex items-center justify-between text-[13px]"><span className="text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">200 / 206</span><span className="text-gray-500">Binary Stream</span></div>
                                    <div className="flex items-center justify-between text-[13px]"><span className="text-red-500 font-semibold bg-red-50 px-1.5 py-0.5 rounded">404</span><span className="text-gray-500">Not found</span></div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Download */}
                            <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white hover:border-blue-100 transition-colors shadow-sm hover:shadow-md duration-300">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50/50 border-b border-gray-100 gap-4">
                                <div className="flex items-center gap-3">
                                  <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-widest uppercase">GET</span>
                                  <code className="font-mono text-[14px] text-gray-800">/api/files/:fileId/download</code>
                                </div>
                                <span className="text-[13px] text-gray-500 font-medium">Download File</span>
                              </div>
                              <div className="p-5">
                                <p className="text-[14px] text-gray-600 leading-relaxed">Triggers a direct download of any file, forcing the browser to save it via the <code className="text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded text-[13px] font-mono mx-1">Content-Disposition: attachment</code> header.</p>
                              </div>
                            </div>
                            
                            {/* Upload */}
                            <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white hover:border-blue-100 transition-colors shadow-sm hover:shadow-md duration-300">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50/50 border-b border-gray-100 gap-4">
                                <div className="flex items-center gap-3">
                                  <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-widest uppercase">POST</span>
                                  <code className="font-mono text-[14px] text-gray-800">/api/files/upload</code>
                                </div>
                                <span className="text-[13px] text-gray-500 font-medium">Upload File</span>
                              </div>
                              <div className="p-5">
                                <p className="text-[14px] text-gray-600 leading-relaxed mb-4">Directly upload a new file to your drive using standard <code className="text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded text-[13px] font-mono mx-1">multipart/form-data</code>. Maximum file size is 2GB per request.</p>
                                <div className="bg-gray-50/80 border border-gray-100 rounded-xl p-4 font-mono text-[13px] text-gray-600 overflow-x-auto">
                                  <div className="text-gray-400 mb-2">// Example cURL request</div>
                                  <div className="text-blue-600">curl -X POST \</div>
                                  <div className="text-gray-600 pl-4">-H <span className="text-purple-600">"x-api-key: td_live_xxx"</span> \</div>
                                  <div className="text-gray-600 pl-4">-F <span className="text-green-600">"file=@/path/to/video.mp4"</span> \</div>
                                  <div className="text-gray-600 pl-4">-F <span className="text-green-600">"folderId=optional_folder_id"</span> \</div>
                                  <div className="text-gray-600 pl-4">http://localhost:3000/api/files/upload</div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Thumbnail */}
                            <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white hover:border-blue-100 transition-colors shadow-sm hover:shadow-md duration-300">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50/50 border-b border-gray-100 gap-4">
                                <div className="flex items-center gap-3">
                                  <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-widest uppercase">GET</span>
                                  <code className="font-mono text-[14px] text-gray-800">/api/files/:fileId/thumbnail</code>
                                </div>
                                <span className="text-[13px] text-gray-500 font-medium">Get Thumbnail</span>
                              </div>
                              <div className="p-5">
                                <p className="text-[14px] text-gray-600 leading-relaxed">Retrieves a lightweight, compressed image thumbnail for supported media formats to quickly preview files.</p>
                              </div>
                            </div>

                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : currentTab === 'docs' ? (
              <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-12 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-32">
                {/* Fixed Sidebar for Documentation */}
                <aside className="lg:w-72 flex-shrink-0 space-y-10 lg:sticky lg:top-8 self-start">
                  <div>
                    <div className="flex items-center gap-3 mb-6 px-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-lg">
                        <Terminal className="w-4 h-4" />
                      </div>
                      <h3 className="font-black text-gray-900 tracking-tight">API v1.4 Reference</h3>
                    </div>
                    
                    <nav className="space-y-6">
                      <div>
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 px-4">Fundamentals</h4>
                        <div className="space-y-1">
                          {[
                            { label: 'Quick Start', id: 'intro' },
                            { label: 'Authentication', id: 'auth' },
                            { label: 'Errors', id: 'errors' }
                          ].map(item => (
                            <button 
                              key={item.id} 
                              onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                              className="w-full text-left px-4 py-2 rounded-xl text-[14px] font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-all"
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 px-4">Storage API</h4>
                        <div className="space-y-1">
                          {[
                            { label: 'File Operations', id: 'files' },
                            { label: 'Folder Logic', id: 'folders' },
                            { label: 'Upload System', id: 'uploads' }
                          ].map(item => (
                            <button 
                              key={item.id} 
                              onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                              className="w-full text-left px-4 py-2 rounded-xl text-[14px] font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-all"
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 px-4">Network API</h4>
                        <div className="space-y-1">
                          {[
                            { label: 'Streaming Media', id: 'streaming' },
                            { label: 'Community Sync', id: 'sync' },
                            { label: 'Sharing', id: 'sharing' }
                          ].map(item => (
                            <button 
                              key={item.id} 
                              onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                              className="w-full text-left px-4 py-2 rounded-xl text-[14px] font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-all"
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </nav>
                  </div>

                  <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                    <p className="text-[12px] text-blue-700 font-bold mb-2">Need Help?</p>
                    <p className="text-[12px] text-blue-600/80 leading-relaxed mb-4">Our engineering team is available for custom integration support.</p>
                    <button className="text-[12px] font-black text-blue-700 hover:underline">Contact Support →</button>
                  </div>
                </aside>

                {/* Documentation Content Area */}
                <main className="flex-1 space-y-24">
                  {/* Header */}
                  <header id="intro">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">Production Ready</div>
                    <h1 className="text-5xl font-black text-gray-900 tracking-tight mb-6">Build on the Edge.</h1>
                    <p className="text-xl text-gray-500 max-w-3xl leading-relaxed">
                      TeleDrive provides a robust, low-latency REST API to interact with your Telegram-backed cloud storage. Automate uploads, stream 4K media, and manage community files with sub-second response times.
                    </p>
                  </header>

                  {/* Authentication Section */}
                  <section id="auth" className="space-y-8 scroll-mt-8">
                    <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                      <div className="w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center text-white shadow-xl">
                        <Lock className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-black text-gray-900">Authentication</h2>
                        <p className="text-gray-500 font-medium">Securing your requests with API Keys</p>
                      </div>
                    </div>
                    
                    <div className="prose prose-slate max-w-none">
                      <p className="text-gray-600 text-lg leading-relaxed">
                        TeleDrive uses API Keys to authenticate requests. You can view and manage your API key below. Your API key carries many privileges, so be sure to keep it secret!
                      </p>
                    </div>

                    <div className="bg-white rounded-[32px] border border-gray-200 p-8 shadow-sm">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                        <div>
                          <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">Your Secret API Key</h4>
                          <p className="text-sm text-gray-500">Only visible to you.</p>
                        </div>
                        {user.developerApiKey ? (
                          <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 p-2 rounded-2xl">
                            <code className="px-4 font-mono text-[14px] text-blue-600 font-bold">{user.developerApiKey.substring(0, 8)}••••••••••••••••</code>
                            <button 
                                onClick={() => { navigator.clipboard.writeText(user.developerApiKey); toast.success("Copied to clipboard"); }}
                                className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-900 text-xs font-bold rounded-xl border border-gray-200 transition shadow-sm"
                            >
                                Copy Key
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setCurrentTab('settings')} className="px-6 py-3 bg-blue-600 text-white font-black text-[13px] rounded-2xl shadow-lg shadow-blue-200 hover:-translate-y-0.5 transition-all">Generate API Key</button>
                        )}
                      </div>
                    </div>
                  </section>

                  {/* Errors Section */}
                  <section id="errors" className="space-y-8 scroll-mt-8">
                    <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                      <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-xl">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-black text-gray-900">HTTP Status Codes</h2>
                        <p className="text-gray-500 font-medium">Handling responses gracefully</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { code: '200 OK', desc: 'Request was successful.' },
                        { code: '206 Partial', desc: 'Used for Range-request streaming.' },
                        { code: '401 Unauthorized', desc: 'API Key is missing or invalid.' },
                        { code: '404 Not Found', desc: 'File or folder does not exist.' },
                        { code: '429 Rate Limit', desc: 'Too many requests to Telegram.' },
                        { code: '500 Server Error', desc: 'Something went wrong on our end.' }
                      ].map(err => (
                        <div key={err.code} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                          <span className="font-bold text-gray-900 block mb-1">{err.code}</span>
                          <span className="text-xs text-gray-500">{err.desc}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* File Operations Section */}
                  <section id="files" className="space-y-10 scroll-mt-8">
                    <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-xl">
                        <FileIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-black text-gray-900">File Operations</h2>
                        <p className="text-gray-500 font-medium">CRUD operations for your cloud assets</p>
                      </div>
                    </div>

                    <div className="space-y-12">
                      <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[10px] font-black uppercase">GET</span>
                          <code className="font-bold">/api/files</code>
                        </div>
                        <p className="text-gray-600 text-[15px] mb-4">Fetch all files with support for <code>folderId</code> and <code>page</code> parameters.</p>
                      </div>

                      <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[10px] font-black uppercase">GET</span>
                          <code className="font-bold">/api/files/:fileId/thumbnail</code>
                        </div>
                        <p className="text-gray-600 text-[15px] mb-4">Retrieve an optimized 200px preview of any photo or video file.</p>
                      </div>
                    </div>
                  </section>

                  {/* Folder Logic Section */}
                  <section id="folders" className="space-y-10 scroll-mt-8">
                    <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-xl">
                        <Folder className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-black text-gray-900">Folder Logic</h2>
                        <p className="text-gray-500 font-medium">Virtual tree management</p>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[10px] font-black uppercase">POST</span>
                          <code className="font-bold">/api/files/folder</code>
                        </div>
                        <p className="text-gray-600 text-[15px] mb-4">Create a virtual folder. Personal folders use DB-only logic; Channel folders link to Telegram chats.</p>
                      </div>
                    </div>
                  </section>

                  {/* Upload System */}
                  <section id="uploads" className="space-y-10 scroll-mt-8">
                    <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                      <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center text-white shadow-xl">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-black text-gray-900">Upload System</h2>
                        <p className="text-gray-500 font-medium">Multi-part chunked uploads</p>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-[10px] font-black uppercase">POST</span>
                          <code className="font-bold">/api/uploads/init</code>
                        </div>
                        <p className="text-gray-600 text-[15px]">Initialize a session to receive 5MB chunks.</p>
                      </div>
                    </div>
                  </section>

                  {/* Streaming Section */}
                  <section id="streaming" className="space-y-10 scroll-mt-8">
                    <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl">
                        <Play className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-black text-gray-900">Streaming Media</h2>
                        <p className="text-gray-500 font-medium">Byte-range content delivery</p>
                      </div>
                    </div>
                    <div className="p-10 bg-gray-900 rounded-[40px] text-white">
                        <h4 className="font-bold mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400" /> Performance Protocol</h4>
                        <p className="text-blue-100/70 text-sm leading-relaxed mb-6">Always use <code>Range: bytes=0-1048575</code> headers to prevent socket timeouts on large files.</p>
                        <pre className="text-emerald-400 text-xs">GET /api/files/:id/stream?token=... HTTP/1.1</pre>
                    </div>
                  </section>

                  {/* Community Sync Section */}
                  <section id="sync" className="space-y-10 scroll-mt-8">
                    <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                      <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center text-white shadow-xl">
                        <RefreshCcw className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-black text-gray-900">Community Sync</h2>
                        <p className="text-gray-500 font-medium">TeleDrive x Telegram Bridge</p>
                      </div>
                    </div>
                    <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-4 mb-4">
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[10px] font-black uppercase">POST</span>
                        <code className="font-bold">/api/files/sync</code>
                      </div>
                      <p className="text-gray-600 text-[15px]">Scans linked Telegram channels for new media and indexes them automatically.</p>
                    </div>
                  </section>

                  {/* Sharing Section */}
                  <section id="sharing" className="space-y-10 scroll-mt-8">
                    <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                      <div className="w-12 h-12 rounded-2xl bg-pink-600 flex items-center justify-center text-white shadow-xl">
                        <Share2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-black text-gray-900">Sharing</h2>
                        <p className="text-gray-500 font-medium">Public & Private access links</p>
                      </div>
                    </div>
                    <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-4 mb-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[10px] font-black uppercase">POST</span>
                        <code className="font-bold">/api/share/create</code>
                      </div>
                      <p className="text-gray-600 text-[15px]">Generate a signed token for public file access with optional password protection.</p>
                    </div>
                  </section>
                </main>
              </div>
            ) : loading ? (
              <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8' : 'space-y-3'}`}>
                {[...Array(10)].map((_, i) => (
                  viewMode === 'grid' ? (
                    <div key={i} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm animate-pulse">
                      <div className="aspect-[16/10] bg-gray-50"></div>
                      <div className="p-4 space-y-3">
                        <div className="h-4 bg-gray-100 rounded-full w-3/4"></div>
                        <div className="h-3 bg-gray-50 rounded-full w-1/2"></div>
                      </div>
                    </div>
                  ) : (
                    <div key={i} className="flex items-center gap-4 p-4 bg-white border border-gray-50 rounded-xl animate-pulse">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-100 rounded-full w-48"></div>
                        <div className="h-3 bg-gray-50 rounded-full w-24"></div>
                      </div>
                      <div className="w-24 h-4 bg-gray-50 rounded-full"></div>
                    </div>
                  )
                ))}
              </div>
            ) : (['channels', 'groups'].includes(currentTab) && !currentFolderId) ? (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shadow-sm">
                      {currentTab === 'channels' ? <Zap className="w-5 h-5 text-blue-600" /> : <Users className="w-5 h-5 text-blue-600" />}
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 capitalize">My {currentTab}</h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {folders.filter(f => f.isOwner && (!searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase()))).length === 0 ? (
                      <div className="col-span-full py-12 text-center text-gray-400 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100">
                        {searchQuery ? "No matching folders found" : `No ${currentTab} owned by you`}
                      </div>
                    ) : (
                      folders.filter(f => f.isOwner && (!searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase()))).map((folder, i) => renderFolderTile(folder, i))
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shadow-sm">
                      <Share2 className="w-5 h-5 text-purple-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 capitalize">Joined {currentTab}</h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {folders.filter(f => !f.isOwner && (!searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase()))).length === 0 ? (
                      <div className="col-span-full py-12 text-center text-gray-400 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100">
                        {searchQuery ? "No matching folders found" : `No joined ${currentTab} available`}
                      </div>
                    ) : (
                      folders.filter(f => !f.isOwner && (!searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase()))).map((folder, i) => renderFolderTile(folder, i))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                  {folders.filter(f => !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase())).map((folder, i) => renderFolderTile(folder, i))}
                  {files
                    .filter(f => !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .sort((a, b) => {
                      if (sortBy === 'name') return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
                      if (sortBy === 'date') return sortOrder === 'asc' ? new Date(a.createdAt) - new Date(b.createdAt) : new Date(b.createdAt) - new Date(a.createdAt);
                      if (sortBy === 'size') return sortOrder === 'asc' ? a.size - b.size : b.size - a.size;
                      return 0;
                    })
                    .map((item, i) => (
                      <div 
                        key={item._id} 
                        onDoubleClick={() => handleDoubleClick(item)}
                        onContextMenu={(e) => handleContextMenu(e, item)}
                        className={`group relative bg-white border rounded-2xl overflow-hidden hover:shadow-2xl transition-all cursor-pointer select-none ${selectedItems.includes(item._id) ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-gray-200 hover:border-blue-200'}`}
                      >
                        <div className="aspect-[16/10] bg-gray-50 flex items-center justify-center group-hover:bg-blue-50/50 transition-colors overflow-hidden relative">
                          <div 
                            className={`absolute top-3 left-3 z-20 w-6 h-6 rounded-lg border transition-all flex items-center justify-center ${selectedItems.includes(item._id) ? 'bg-blue-600 border-blue-600 shadow-md scale-110' : 'bg-white/90 border-gray-300 opacity-0 group-hover:opacity-100 shadow-sm'}`}
                            onClick={(e) => toggleSelection(e, item._id)}
                          >
                            {selectedItems.includes(item._id) && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                          </div>
                          {item.isStarred && <Star className="absolute top-3 right-3 w-5 h-5 text-yellow-400 fill-yellow-400 drop-shadow-md z-20" />}
                          
                          <div className="w-full h-full">
                            {item.isFolder || item.folderType ? getFileIcon(item, "w-20 h-20", true) : (
                              <div className="w-full h-full">
                                {(isImageFile(item) || isVideoFile(item)) ? (
                                  <img 
                                    src={`http://localhost:3000/api/files/${item._id}/thumbnail?token=${localStorage.getItem('token')}`} 
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                                    alt={item.name} 
                                    loading="lazy"
                                    decoding="async"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gray-50/50">
                                    <div className="transform scale-[2.0] flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                                      {getFileIcon(item, "w-16 h-16")}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-white">
                          <h4 className="font-bold text-gray-900 text-[15px] truncate mb-0.5">{item.name}</h4>
                          <div className="flex items-center justify-between">
                            <p className="text-[12px] text-gray-500 font-medium">{item.isFolder ? (item.folderType ? item.folderType.charAt(0).toUpperCase() + item.folderType.slice(1) : 'Folder') : (item.size / 1024 / 1024).toFixed(1) + ' MB'}</p>
                            {!item.isFolder && <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">{item.mimeType?.split('/')[1] || 'FILE'}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                          <th className="px-6 py-4 w-12">
                            <div onClick={selectAll} className={`w-5 h-5 rounded border-2 cursor-pointer transition-all flex items-center justify-center ${selectedItems.length === itemsToDisplay.length ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                              {selectedItems.length === itemsToDisplay.length && <Check className="w-3.5 h-3.5 text-white" />}
                            </div>
                          </th>
                          <th className="px-6 py-4 font-semibold text-gray-600 text-[14px]">Name</th>
                          <th className="px-6 py-4 font-semibold text-gray-600 text-[14px] w-48">Sender</th>
                          <th className="px-6 py-4 font-semibold text-gray-600 text-[14px] w-32">Size</th>
                          <th className="px-6 py-4 font-semibold text-gray-600 text-[14px] w-48">Last Modified</th>
                          <th className="px-6 py-4 w-16"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {itemsToDisplay.map((item) => (
                          <tr 
                            key={item._id} 
                            onDoubleClick={() => handleDoubleClick(item)}
                            onContextMenu={(e) => handleContextMenu(e, item)}
                            className={`group hover:bg-blue-50/50 transition-colors cursor-pointer relative select-none ${selectedItems.includes(item._id) ? 'bg-blue-50' : ''}`}
                          >
                            <td className="px-6 py-4">
                              <div 
                                onClick={(e) => toggleSelection(e, item._id)} 
                                className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${selectedItems.includes(item._id) ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300 opacity-0 group-hover:opacity-100'}`}
                              >
                                {selectedItems.includes(item._id) && <Check className="w-3 h-3 text-white" />}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                <div className="relative flex-shrink-0">
                                  {getFileIcon(item, "w-7 h-7")}
                                  {item.isStarred && (
                                    <div className="absolute -top-1 -right-1 text-yellow-400">
                                      <Star className="w-2.5 h-2.5 fill-yellow-400" />
                                    </div>
                                  )}
                                </div>
                                <span className="font-medium text-gray-900 text-[15px] truncate max-w-[300px]">{item.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-[14px] text-gray-500">
                              <span className="bg-gray-100 px-2 py-1 rounded text-[11px] font-medium">{item.senderName || user.firstName}</span>
                            </td>
                            <td className="px-6 py-4 text-[14px] text-gray-500">
                              {item.isFolder ? '--' : (item.size / 1024 / 1024).toFixed(2) + ' MB'}
                            </td>
                            <td className="px-6 py-4 text-[14px] text-gray-500">
                              {new Date(item.updatedAt || item.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === item._id ? null : item._id); }}
                                className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-white rounded-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all shadow-sm"
                              >
                                <MoreVertical className="w-5 h-5" />
                              </button>
                              
                              {/* Context Menu */}
                              {activeMenu === item._id && (
                                <div className="absolute right-12 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl py-1.5 z-10 animate-in fade-in zoom-in-95 text-left">
                                  {currentTab === 'trash' ? (
                                    <>
                                      <button onClick={(e) => handleAction('restore', item, e)} className="w-full flex items-center gap-3 px-4 py-2 text-[14px] text-gray-700 hover:bg-gray-50">
                                        <RefreshCcw className="w-4 h-4" /> Restore
                                      </button>
                                      <div className="h-px bg-gray-100 my-1"></div>
                                      <button onClick={(e) => handleAction('delete', item, e)} className="w-full flex items-center gap-3 px-4 py-2 text-[14px] text-red-600 hover:bg-red-50">
                                        <Trash2 className="w-4 h-4" /> Delete Forever
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button onClick={(e) => handleAction('share', item, e)} className="w-full flex items-center gap-3 px-4 py-2 text-[14px] text-gray-700 hover:bg-gray-50">
                                        <Share2 className="w-4 h-4" /> Share
                                      </button>
                                      <button onClick={(e) => handleAction('info', item, e)} className="w-full flex items-center gap-3 px-4 py-2 text-[14px] text-gray-700 hover:bg-gray-50">
                                        <List className="w-4 h-4" /> File Info
                                      </button>
                                      <button onClick={(e) => handleAction('rename', item, e)} className="w-full flex items-center gap-3 px-4 py-2 text-[14px] text-gray-700 hover:bg-gray-50">
                                        <Edit2 className="w-4 h-4" /> Rename
                                      </button>
                                      <div className="h-px bg-gray-100 my-1"></div>
                                      <button onClick={(e) => handleAction('cut', item, e)} className="w-full flex items-center gap-3 px-4 py-2 text-[14px] text-gray-700 hover:bg-gray-50">
                                        <X className="w-4 h-4" /> Cut
                                      </button>
                                      <button onClick={(e) => handleAction('copy', item, e)} className="w-full flex items-center gap-3 px-4 py-2 text-[14px] text-gray-700 hover:bg-gray-50">
                                        <FilePlus className="w-4 h-4" /> Copy
                                      </button>
                                      <div className="h-px bg-gray-100 my-1"></div>
                                      <button onClick={(e) => handleAction('trash', item, e)} className="w-full flex items-center gap-3 px-4 py-2 text-[14px] text-red-600 hover:bg-red-50">
                                        <Trash2 className="w-4 h-4" /> Move to Trash
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && !searchQuery && (
              <div className="mt-12 flex items-center justify-between border-t border-gray-100 pt-8">
                <div className="text-sm text-gray-500 font-medium">
                  Showing <span className="text-gray-900 font-bold">{(currentPage - 1) * 20 + 1}</span> - <span className="text-gray-900 font-bold">{Math.min(currentPage * 20, pagination.totalFiles)}</span> of <span className="text-gray-900 font-bold">{pagination.totalFiles}</span> files
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-sm"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  {[...Array(pagination.totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    // Show first, last, and pages around current
                    if (
                      pageNum === 1 || 
                      pageNum === pagination.totalPages || 
                      (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${
                            currentPage === pageNum 
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                              : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                    if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                      return <span key={pageNum} className="text-gray-400">...</span>;
                    }
                    return null;
                  })}
                  <button 
                    disabled={currentPage === pagination.totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-sm"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
          {/* Share Modal */}
          {shareLink ? (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                    <Share2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Share Link Created</h3>
                </div>
                <p className="text-sm text-gray-500 mb-6">Anyone with this link can view the file.</p>
                
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-2 mb-6">
                  <input type="text" readOnly value={shareLink} className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 px-2" />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(shareLink);
                      toast.success("Copied to clipboard!");
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
                  >
                    Copy
                  </button>
                </div>
                
                <button onClick={() => setShareLink(null)} className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-xl transition">
                  Close
                </button>
              </div>
            </div>
          ) : showShareSettings && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Share Settings</h3>
                </div>
                
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-2">Access Type</label>
                    <select 
                      value={shareSettings.type}
                      onChange={(e) => setShareSettings({...shareSettings, type: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                    >
                      <option value="public">Public (Anyone with link)</option>
                      <option value="private">Private (Restricted)</option>
                    </select>
                  </div>
                  
                  {shareSettings.type === 'private' && (
                    <div>
                      <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-2">Password (Optional)</label>
                      <input 
                        type="password"
                        placeholder="Leave blank for no password"
                        value={shareSettings.password}
                        onChange={(e) => setShareSettings({...shareSettings, password: e.target.value})}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-2">Expiry (Optional)</label>
                    <input 
                      type="date"
                      value={shareSettings.expiresAt}
                      onChange={(e) => setShareSettings({...shareSettings, expiresAt: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowShareSettings(null)} 
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={async () => {
                      const item = showShareSettings;
                      setShowShareSettings(null);
                      try {
                        const res = await shareAPI.createShare(
                          item._id, 
                          shareSettings.type, 
                          shareSettings.expiresAt || null, 
                          shareSettings.password || null
                        );
                        setShareLink(`${window.location.origin}/share/${res.data.token}`);
                      } catch (err) {
                        toast.error("Failed to create share link");
                      }
                    }} 
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition shadow-sm"
                  >
                    Create Link
                  </button>
                </div>
              </div>
            </div>
          )}
    
          {/* Media Preview Modal - Google Drive Style */}
          {previewFile && (
            <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col animate-in fade-in duration-200" onClick={(e) => {
              if (e.target === e.currentTarget) setPreviewFile(null);
            }}>
              {/* Top Bar - Google Drive Style */}
              <div className="w-full flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent absolute top-0 left-0 right-0 z-50 transition-opacity duration-300 opacity-100 md:opacity-0 md:hover:opacity-100 group">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setPreviewFile(null)}
                    className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <h3 className="text-white font-medium text-[15px] truncate max-w-sm">{previewFile.name}</h3>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleAction('share', previewFile, e); }}
                    className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition"
                    title="Share"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleAction('download', previewFile, e); }}
                    className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition"
                    title="Download"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Media Content */}
              <div className="flex-1 flex items-center justify-center p-4 md:p-12 overflow-hidden" onClick={(e) => {
                if (e.target === e.currentTarget) setPreviewFile(null);
              }}>
                {isImageFile(previewFile) ? (
                  <img 
                    src={fileAPI.getStreamUrl(previewFile._id)} 
                    alt={previewFile.name} 
                    className="max-w-full max-h-full object-contain"
                  />
                ) : isVideoFile(previewFile) ? (
                  <CustomVideoPlayer 
                    src={fileAPI.getStreamUrl(previewFile._id)} 
                    title={previewFile.name} 
                  />
                ) : isAudioFile(previewFile) ? (
                  <div className="bg-gray-900 p-8 rounded-2xl w-full max-w-md shadow-2xl border border-gray-800 text-center">
                    <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                      <FileIcon className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-white font-medium text-lg mb-6 truncate px-4">{previewFile.name}</h3>
                    <audio 
                      src={fileAPI.getStreamUrl(previewFile._id)} 
                      controls 
                      autoPlay
                      className="w-full outline-none mt-4"
                    />
                  </div>
                ) : isPdfFile(previewFile) ? (
                  <div className="w-full h-full max-w-5xl flex flex-col gap-4 mt-8">
                    <embed 
                      src={fileAPI.getStreamUrl(previewFile._id)} 
                      type="application/pdf"
                      className="w-full flex-1 bg-white shadow-2xl rounded-xl border-none outline-none overflow-hidden"
                    />
                    <div className="text-center">
                      <a 
                        href={fileAPI.getStreamUrl(previewFile._id)} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-white/50 hover:text-white text-sm underline transition"
                      >
                        PDF not loading? Open in new tab
                      </a>
                    </div>
                  </div>
                ) : isTextFile(previewFile) ? (
                  <div className="w-full max-w-5xl h-full max-h-[85vh] bg-white rounded-xl flex flex-col overflow-hidden shadow-2xl mt-8">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center text-gray-800 font-medium">
                      <div className="flex items-center gap-2">
                        <Edit2 className="w-4 h-4 text-gray-400" />
                        <span className="text-[14px]">{previewFile.name}</span>
                      </div>
                      <button 
                        onClick={handleSaveText}
                        disabled={isSavingText}
                        className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[13px] rounded-lg transition disabled:opacity-50"
                      >
                        {isSavingText ? <RefreshCcw className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                      </button>
                    </div>
                    <textarea 
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      className="flex-1 w-full h-full p-4 font-mono text-[14px] text-gray-800 bg-white outline-none resize-none"
                      spellCheck="false"
                    />
                  </div>
                ) : (
                  <div className="text-white/70 bg-gray-900/50 p-8 rounded-2xl border border-white/10 backdrop-blur-md text-center">
                    <FileIcon className="w-16 h-16 text-white/30 mx-auto mb-4" />
                    Preview not available for this file type.<br />
                    <button 
                      onClick={(e) => handleAction('download', previewFile, e)}
                      className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
                    >
                      Download File
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
    
          {/* Folder Modal */}
          {showFolderModal && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {folderType === 'channel' ? 'New Channel Folder' : folderType === 'group' ? 'New Group Folder' : 'New Folder'}
                </h3>
                <input 
                  type="text" 
                  value={folderNameInput}
                  onChange={(e) => setFolderNameInput(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-[15px] mb-6"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && submitCreateFolder()}
                />
                <div className="flex gap-3">
                  <button 
                    onClick={() => { setShowFolderModal(false); setFolderType('personal'); }} 
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={submitCreateFolder} 
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          )}
    
          {/* File Modal */}
          {showFileModal && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4">New Text File</h3>
                <input 
                  type="text" 
                  value={fileNameInput}
                  onChange={(e) => setFileNameInput(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-[15px] mb-6"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && submitCreateFile()}
                />
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowFileModal(false)} 
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={submitCreateFile} 
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Extract Modal */}
          {showExtractModal && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                    <Archive className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Extract ZIP</h3>
                </div>
                <p className="text-[14px] text-gray-500 mb-4">Enter a folder name to extract into:</p>
                <input 
                  type="text" 
                  value={extractFolderInput}
                  onChange={(e) => setExtractFolderInput(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-[15px] mb-6"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && submitExtract()}
                />
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowExtractModal(null)} 
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={submitExtract} 
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition shadow-sm"
                  >
                    Extract
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Compress Modal */}
          {showCompressModal && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                    <Archive className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Compress to ZIP</h3>
                </div>
                <p className="text-[14px] text-gray-500 mb-4">Enter a name for your new archive:</p>
                <input 
                  type="text" 
                  value={zipNameInput}
                  onChange={(e) => setZipNameInput(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-[15px] mb-6"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && submitCompress()}
                />
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowCompressModal(null)} 
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={submitCompress} 
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition shadow-sm"
                  >
                    Compress
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Share Modal */}
          {showShareModal && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                    <Share2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Share Link Created</h3>
                    <p className="text-xs text-gray-400 truncate max-w-[200px]">{showShareModal.item?.name}</p>
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center gap-2 mb-4">
                  <p className="text-[13px] font-mono text-blue-600 flex-1 truncate">{showShareModal.shareUrl}</p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(showShareModal.shareUrl);
                      toast.success('Link copied!');
                    }}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition flex-shrink-0"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowShareModal(null)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-xl transition">
                    Close
                  </button>
                  <a
                    href={showShareModal.shareUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition text-center"
                  >
                    Open Link
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Import Modal */}
          {showImportModal && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Import File from URL</h3>
                <input 
                  type="url" 
                  placeholder="https://example.com/file.png"
                  value={importUrlInput}
                  onChange={(e) => setImportUrlInput(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-[15px] mb-6"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && !isImporting && submitImportUrl()}
                  disabled={isImporting}
                />
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowImportModal(false)} 
                    disabled={isImporting}
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-xl transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={submitImportUrl} 
                    disabled={isImporting}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition disabled:opacity-50"
                  >
                    {isImporting ? <RefreshCcw className="w-5 h-5 animate-spin" /> : 'Import'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Password Modal */}
          {showPasswordModal && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Set Password</h3>
                <p className="text-sm text-gray-500 mb-4">Set a password to login without generating an OTP every time.</p>
                <input 
                  type="password" 
                  placeholder="Minimum 6 characters"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-[15px] mb-6"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && submitSetPassword()}
                />
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowPasswordModal(false)} 
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={submitSetPassword} 
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition"
                  >
                    Set Password
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Info Modal */}
          {showInfoModal && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center gap-4 mb-2">
                    {showInfoModal.isFolder ? <Folder className="w-8 h-8 text-blue-500" fill="#bfdbfe" /> : <FileIcon className="w-8 h-8 text-gray-400" />}
                    <h3 className="text-xl font-bold text-gray-900 truncate">{showInfoModal.name}</h3>
                  </div>
                  <p className="text-sm text-gray-500">{showInfoModal.isFolder ? 'Folder' : showInfoModal.mimeType}</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center text-[14px]">
                    <span className="text-gray-500 font-medium">Type</span>
                    <span className="text-gray-900">{showInfoModal.isFolder ? 'Folder' : 'File'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[14px]">
                    <span className="text-gray-500 font-medium">Size</span>
                    <span className="text-gray-900">{showInfoModal.isFolder ? '--' : (showInfoModal.size / 1024 / 1024).toFixed(2) + ' MB'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[14px]">
                    <span className="text-gray-500 font-medium">Created</span>
                    <span className="text-gray-900">{new Date(showInfoModal.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-[14px]">
                    <span className="text-gray-500 font-medium">Modified</span>
                    <span className="text-gray-900">{new Date(showInfoModal.updatedAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-[14px]">
                    <span className="text-gray-500 font-medium">Location</span>
                    <span className="text-gray-900 truncate max-w-[150px]">{currentFolderId === 'root' ? 'My Drive' : currentFolderId}</span>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-100">
                  <button 
                    onClick={() => setShowInfoModal(null)} 
                    className="w-full py-2.5 bg-white border border-gray-200 hover:bg-gray-100 text-gray-800 font-medium rounded-xl transition shadow-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Rename Modal */}
          {showRenameModal && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Rename</h3>
                <input 
                  type="text" 
                  value={renameInput}
                  onChange={(e) => setRenameInput(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-[15px] mb-6"
                  autoFocus
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => e.key === 'Enter' && submitRename()}
                />
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowRenameModal(null)} 
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={submitRename} 
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Right-click Context Menu */}
          {contextMenu && (
            <>
              <div className="fixed inset-0 z-[150]" onClick={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}></div>
              <div 
                className="fixed bg-white border border-gray-100 rounded-xl shadow-2xl py-1.5 z-[160] animate-in fade-in zoom-in-95 w-48"
                style={{ left: contextMenu.x, top: contextMenu.y }}
              >
                {currentTab === 'trash' ? (
                  <>
                    <button onClick={(e) => { setContextMenu(null); handleAction('restore', contextMenu.item, e); }} className="w-full flex items-center gap-3 px-4 py-2 text-[13.5px] text-gray-700 hover:bg-gray-50">
                      <RefreshCcw className="w-4 h-4 text-gray-400" /> Restore
                    </button>
                    <button onClick={(e) => { setContextMenu(null); handleAction('delete', contextMenu.item, e); }} className="w-full flex items-center gap-3 px-4 py-2 text-[13.5px] text-red-600 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" /> Delete Forever
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={(e) => { setContextMenu(null); handleDoubleClick(contextMenu.item); }} className="w-full flex items-center gap-3 px-4 py-2 text-[13.5px] font-bold text-gray-900 hover:bg-gray-50">
                      <Maximize className="w-4 h-4 text-blue-500" /> Open
                    </button>
                    <button onClick={(e) => { setContextMenu(null); handleAction('share', contextMenu.item, e); }} className="w-full flex items-center gap-3 px-4 py-2 text-[13.5px] text-gray-700 hover:bg-gray-50">
                      <Share2 className="w-4 h-4 text-gray-400" /> Share
                    </button>
                    <button onClick={(e) => { setContextMenu(null); handleAction('star', contextMenu.item, e); }} className="w-full flex items-center gap-3 px-4 py-2 text-[13.5px] text-gray-700 hover:bg-gray-50">
                      <Star className={`w-4 h-4 ${contextMenu.item.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} /> {contextMenu.item.isStarred ? 'Unstar' : 'Star'}
                    </button>
                    <button onClick={(e) => { setContextMenu(null); handleAction('download', contextMenu.item, e); }} className="w-full flex items-center gap-3 px-4 py-2 text-[13.5px] text-gray-700 hover:bg-gray-50">
                      <Download className="w-4 h-4 text-gray-400" /> Download
                    </button>
                    {contextMenu.item.name.toLowerCase().endsWith('.zip') ? (
                      <button onClick={(e) => { setContextMenu(null); handleAction('extract', contextMenu.item, e); }} className="w-full flex items-center gap-3 px-4 py-2 text-[13.5px] text-blue-600 font-bold hover:bg-blue-50">
                        <Archive className="w-4 h-4" /> Extract Files
                      </button>
                    ) : (
                      <button onClick={(e) => { setContextMenu(null); handleAction('compress', contextMenu.item, e); }} className="w-full flex items-center gap-3 px-4 py-2 text-[13.5px] text-gray-700 hover:bg-gray-50">
                        <Archive className="w-4 h-4 text-gray-400" /> Compress
                      </button>
                    )}
                    <div className="h-px bg-gray-100 my-1"></div>
                    <button onClick={(e) => { setContextMenu(null); handleAction('rename', contextMenu.item, e); }} className="w-full flex items-center gap-3 px-4 py-2 text-[13.5px] text-gray-700 hover:bg-gray-50">
                      <Edit2 className="w-4 h-4 text-gray-400" /> Rename
                    </button>
                    <button onClick={(e) => { setContextMenu(null); handleAction('cut', contextMenu.item, e); }} className="w-full flex items-center gap-3 px-4 py-2 text-[13.5px] text-gray-700 hover:bg-gray-50">
                      <X className="w-4 h-4 text-gray-400" /> Cut
                    </button>
                    <button onClick={(e) => { setContextMenu(null); handleAction('copy', contextMenu.item, e); }} className="w-full flex items-center gap-3 px-4 py-2 text-[13.5px] text-gray-700 hover:bg-gray-50">
                      <FilePlus className="w-4 h-4 text-gray-400" /> Copy
                    </button>
                    {!contextMenu.item.isFolder && (
                      <button onClick={(e) => { setContextMenu(null); handleAction('thumbnail', contextMenu.item, e); }} className="w-full flex items-center gap-3 px-4 py-2 text-[13.5px] text-gray-700 hover:bg-gray-50">
                        <ImageIcon className="w-4 h-4 text-gray-400" /> Set Thumbnail
                      </button>
                    )}
                    <div className="h-px bg-gray-100 my-1"></div>
                    <button onClick={(e) => { setContextMenu(null); handleAction('trash', contextMenu.item, e); }} className="w-full flex items-center gap-3 px-4 py-2 text-[13.5px] text-red-600 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" /> Move to Trash
                    </button>
                  </>
                )}
              </div>
            </>
          )}

          {/* Delete Forever Modal */}
          {showDeleteModal && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Delete Forever?</h3>
                </div>
                <p className="text-[14px] text-gray-500 mb-6 leading-relaxed">
                  Are you sure you want to permanently delete <span className="font-bold text-gray-900">"{showDeleteModal.name}"</span>? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowDeleteModal(null)} 
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={submitDelete} 
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition shadow-md"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Uploads Panel */}
          {showUploadsPanel && (
            <div className="fixed bottom-6 right-6 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[200] animate-in slide-in-from-bottom-5">
              <div className="bg-gray-900 px-4 py-3 flex items-center justify-between">
                <h4 className="text-white font-bold text-sm">Uploads ({uploadQueue.filter(u => u.status === 'uploading').length})</h4>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowUploadsPanel(false)} className="p-1 text-gray-400 hover:text-white transition">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button onClick={() => setUploadQueue([])} className="p-1 text-gray-400 hover:text-white transition">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {uploadQueue.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">No active uploads</div>
                ) : (
                  uploadQueue.map(upload => (
                    <div key={upload.id} className="p-4 border-b border-gray-50 group">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[13px] font-medium text-gray-900 truncate flex-1 pr-2">{upload.name}</p>
                        {upload.status === 'uploading' ? (
                          <button onClick={() => cancelUpload(upload.id)} className="text-gray-400 hover:text-red-500">
                            <XCircle className="w-4 h-4" />
                          </button>
                        ) : upload.status === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : upload.status === 'failed' ? (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        ) : (
                          <span className="text-[10px] text-gray-400 uppercase font-bold">Cancelled</span>
                        )}
                      </div>
                      {upload.status === 'uploading' && (
                        <>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                            <div 
                              className="h-full bg-blue-600 transition-all duration-300 shadow-[0_0_8px_rgba(37,99,235,0.4)]" 
                              style={{ width: `${upload.progress}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">{upload.progress}%</span>
                            <span className="text-gray-500 italic">{upload.speed}</span>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <input 
            type="file" 
            ref={thumbInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={handleThumbChange}
          />
          {/* Members Modal */}
          {showMembersModal && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{showMembersModal.name} Members</h3>
                      <p className="text-sm text-gray-500">Manage participants of this Telegram {showMembersModal.folderType}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowMembersModal(null)} className="p-2 hover:bg-gray-100 rounded-full transition">
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  {loadingMembers ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <RefreshCcw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                      <p className="text-gray-500 font-medium">Fetching participants...</p>
                    </div>
                  ) : members.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No members found or unable to fetch.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {members.map(member => (
                        <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-blue-600 font-bold border border-gray-200">
                              {member.firstName?.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 text-[14px]">
                                {member.firstName} {member.lastName}
                                {member.isAdmin && <span className="ml-2 bg-blue-100 text-blue-600 text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wider">Admin</span>}
                              </p>
                              <p className="text-[12px] text-gray-500">@{member.username || 'no-username'} • {member.phone || 'hidden'}</p>
                            </div>
                          </div>
                          {!member.isAdmin && (
                            <button className="text-xs font-bold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition">
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-100">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(showMembersModal.joinLink);
                      toast.success("Join link copied!");
                    }}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-md flex items-center justify-center gap-2"
                  >
                    <LinkIcon className="w-5 h-5" /> Copy Invite Link
                  </button>
                </div>
              </div>
            </div>
          )}
          <Toaster 
            position="bottom-left" 
            toastOptions={{
              className: 'premium-toast',
              style: {
                background: '#1f2937',
                color: '#fff',
                borderRadius: '12px',
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: '500',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(8px)',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </div>
      </div>
    );
  };

export default PremiumFileManager;

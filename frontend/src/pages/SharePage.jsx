import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Folder, Download, FileText, Image as ImageIcon, Video, Music,
  Archive, FileCode, File as FileIcon, Eye, AlertCircle,
  RefreshCcw, X, ChevronLeft, ChevronRight, Play, ZoomIn
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// ── Helpers ──────────────────────────────────────────────────────────────────
const formatSize = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
};

const isImage = (mime = '', name = '') =>
  mime.startsWith('image/') || /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(name);
const isVideo = (mime = '', name = '') =>
  mime.startsWith('video/') || /\.(mp4|mkv|webm|mov|avi|m4v)$/i.test(name);
const isAudio = (mime = '', name = '') =>
  mime.startsWith('audio/') || /\.(mp3|ogg|wav|flac|aac|m4a)$/i.test(name);

const getIcon = (mime = '', name = '', size = 'md') => {
  const cls = size === 'lg' ? 'w-10 h-10' : 'w-5 h-5';
  if (isImage(mime, name)) return <ImageIcon className={`${cls} text-emerald-500`} />;
  if (isVideo(mime, name)) return <Video className={`${cls} text-blue-500`} />;
  if (isAudio(mime, name)) return <Music className={`${cls} text-purple-500`} />;
  if (mime === 'application/pdf') return <FileText className={`${cls} text-red-500`} />;
  if (/\.(zip|rar|7z|tar|gz)$/i.test(name)) return <Archive className={`${cls} text-amber-500`} />;
  if (/\.(js|ts|py|cpp|java|go|rs|html|css|json|xml)$/i.test(name)) return <FileCode className={`${cls} text-cyan-500`} />;
  return <FileIcon className={`${cls} text-gray-400`} />;
};

// Thumbnail URL for a file in a shared folder
const thumbUrl = (shareToken, fileId) =>
  `${API_BASE}/shares/${shareToken}/files/${fileId}/thumbnail`;

// ── Thumbnail Card component ──────────────────────────────────────────────────
const FileCard = ({ file, shareToken, onClick }) => {
  const [thumbLoaded, setThumbLoaded] = useState(false);
  const [thumbErr, setThumbErr] = useState(false);
  const showThumb = (isImage(file.mimeType, file.name) || isVideo(file.mimeType, file.name)) && !thumbErr;

  return (
    <div
      className="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg hover:border-blue-100 transition-all duration-200 cursor-pointer"
      onClick={() => onClick(file)}
    >
      {/* Thumbnail area */}
      <div className="relative aspect-[4/3] bg-gray-50 flex items-center justify-center overflow-hidden">
        {showThumb ? (
          <>
            <img
              src={thumbUrl(shareToken, file._id)}
              alt={file.name}
              className={`w-full h-full object-cover transition-opacity duration-300 ${thumbLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setThumbLoaded(true)}
              onError={() => setThumbErr(true)}
            />
            {!thumbLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                {getIcon(file.mimeType, file.name, 'lg')}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-300">
            {getIcon(file.mimeType, file.name, 'lg')}
          </div>
        )}

        {/* Video play badge */}
        {isVideo(file.mimeType, file.name) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center group-hover:bg-black/60 transition">
              <Play className="w-5 h-5 text-white ml-0.5" />
            </div>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <ZoomIn className="w-6 h-6 text-white drop-shadow" />
        </div>
      </div>

      {/* Info footer */}
      <div className="px-4 py-3">
        <p className="font-semibold text-gray-900 text-[13px] truncate leading-tight">{file.name}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">{formatSize(file.size)}</p>
      </div>
    </div>
  );
};

// ── Lightbox ──────────────────────────────────────────────────────────────────
const Lightbox = ({ file, shareToken, files, onClose }) => {
  const idx = files.findIndex(f => f._id === file._id);
  const [current, setCurrent] = useState(idx);
  const cur = files[current];

  const prev = useCallback(() => setCurrent(i => Math.max(0, i - 1)), []);
  const next = useCallback(() => setCurrent(i => Math.min(files.length - 1, i + 1)), [files.length]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next, onClose]);

  const previewSrc = `${API_BASE}/shares/${shareToken}/files/${cur._id}/preview`;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex flex-col"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
        <p className="text-white/80 font-medium text-[15px] truncate max-w-sm">{cur.name}</p>
        <div className="flex items-center gap-3">
          <a
            href={`${API_BASE}/shares/${shareToken}/files/${cur._id}/download`}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-xl transition flex items-center gap-2"
            onClick={e => e.stopPropagation()}
          >
            <Download className="w-4 h-4" /> Download
          </a>
          <button onClick={onClose} className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Media */}
      <div className="flex-1 flex items-center justify-center px-16 min-h-0 relative">
        {/* Prev */}
        {current > 0 && (
          <button
            onClick={prev}
            className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        <div className="max-w-5xl w-full max-h-full flex items-center justify-center">
          {isImage(cur.mimeType, cur.name) ? (
            <img
              key={cur._id}
              src={previewSrc}
              alt={cur.name}
              className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl"
            />
          ) : isVideo(cur.mimeType, cur.name) ? (
            <video
              key={cur._id}
              src={previewSrc}
              controls
              autoPlay
              className="max-w-full max-h-[75vh] rounded-xl shadow-2xl outline-none"
            />
          ) : isAudio(cur.mimeType, cur.name) ? (
            <div className="bg-gray-900 p-10 rounded-3xl text-center">
              <Music className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <p className="text-white font-bold mb-6 text-lg">{cur.name}</p>
              <audio src={previewSrc} controls autoPlay className="w-80" />
            </div>
          ) : (
            <div className="bg-white/5 rounded-3xl p-12 text-center border border-white/10">
              {getIcon(cur.mimeType, cur.name, 'lg')}
              <p className="text-white/70 mt-4 mb-6">{cur.name}</p>
              <a
                href={`${API_BASE}/shares/${shareToken}/files/${cur._id}/download`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition"
              >
                <Download className="w-4 h-4" /> Download
              </a>
            </div>
          )}
        </div>

        {/* Next */}
        {current < files.length - 1 && (
          <button
            onClick={next}
            className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Counter */}
      <div className="text-center py-4 text-white/40 text-sm font-medium">
        {current + 1} / {files.length}
      </div>
    </div>
  );
};

// ── Main SharePage ────────────────────────────────────────────────────────────
export default function SharePage() {
  const { token } = useParams();
  const [shareData, setShareData]     = useState(null);
  const [folderItems, setFolderItems] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [lightboxFile, setLightboxFile] = useState(null);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/shares/${token}`);
        const data = await res.json();
        if (data.error) { setError(data.error); return; }
        setShareData(data);

        if (data.isFolder) {
          const r2 = await fetch(`${API_BASE}/shares/${token}/folder-contents`);
          const items = await r2.json();
          setFolderItems(items);
        }
      } catch {
        setError('Failed to load shared content. The link may be invalid or expired.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center">
        <div className="text-center">
          <RefreshCcw className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Loading shared content…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center p-6">
        <div className="bg-white rounded-[32px] shadow-xl border border-gray-100 p-12 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-3">Link Unavailable</h2>
          <p className="text-gray-500 leading-relaxed">{error}</p>
          <a href="/" className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition shadow-lg shadow-blue-200">
            Open TeleDrive
          </a>
        </div>
      </div>
    );
  }

  const { folder, file, permissions, ownerName } = shareData || {};
  const allFiles = folderItems?.files || [];

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 group">
            <img
              src="/logo.png"
              alt="TeleDrive"
              className="h-9 w-9 object-contain rounded-xl"
              onError={(e) => {
                // Fallback: show a blue square with T if logo fails
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <span style={{ display: 'none' }} className="w-9 h-9 rounded-xl bg-blue-600 items-center justify-center text-white font-black text-lg shadow">T</span>
            <span className="text-xl font-black text-gray-900 tracking-tight">TeleDrive</span>
          </a>
          <a
            href="/"
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition shadow-sm shadow-blue-200"
          >
            Sign in
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Shared-by row */}
        {ownerName && (
          <div className="mb-8 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              {ownerName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Shared by</p>
              <p className="font-bold text-gray-900 text-[15px]">{ownerName}</p>
            </div>
          </div>
        )}

        {/* ── Folder Share View ─────────────────────────────────────────────── */}
        {shareData?.isFolder && folder ? (
          <div>
            {/* Folder header */}
            <div className="flex items-center gap-5 mb-10 pb-8 border-b border-gray-100">
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center shadow-sm border border-amber-100 flex-shrink-0">
                <Folder className="w-8 h-8 text-amber-500" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">{folder.name}</h1>
                <p className="text-gray-500 mt-1 font-medium">
                  {allFiles.length} file{allFiles.length !== 1 ? 's' : ''}
                  {folderItems?.folders?.length > 0 && ` · ${folderItems.folders.length} subfolder${folderItems.folders.length !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>

            {/* Sub-folders */}
            {folderItems?.folders?.length > 0 && (
              <div className="mb-10">
                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">Folders</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {folderItems.folders.map(f => (
                    <div key={f._id} className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-amber-100 transition-all cursor-default">
                      <Folder className="w-8 h-8 text-amber-400 mb-3" />
                      <p className="font-bold text-gray-900 text-sm truncate">{f.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Files Grid */}
            {allFiles.length > 0 ? (
              <div>
                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">Files</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {allFiles.map(f => (
                    <FileCard
                      key={f._id}
                      file={f}
                      shareToken={token}
                      onClick={setLightboxFile}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-24 text-gray-400">
                <FileIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="font-medium">This folder is empty</p>
              </div>
            )}
          </div>

        ) : shareData?.file ? (
          /* ── Single File View ────────────────────────────────────────────── */
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-[40px] border border-gray-100 overflow-hidden shadow-lg">
              {/* Thumbnail preview */}
              {(isImage(file.mimeType, file.name) || isVideo(file.mimeType, file.name)) && (
                <div className="relative bg-gray-100 aspect-video flex items-center justify-center overflow-hidden">
                  <img
                    src={`${API_BASE}/shares/${token}/thumbnail`}
                    alt={file.name}
                    className="w-full h-full object-cover"
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                  {isVideo(file.mimeType, file.name) && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm">
                        <Play className="w-7 h-7 text-white ml-1" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="p-8 text-center">
                {!isImage(file.mimeType, file.name) && !isVideo(file.mimeType, file.name) && (
                  <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-gray-100">
                    {getIcon(file.mimeType, file.name, 'lg')}
                  </div>
                )}
                <h1 className="text-xl font-black text-gray-900 mb-1 break-all">{file.name}</h1>
                <p className="text-gray-400 text-sm mb-8">{formatSize(file.size)}</p>

                <div className="flex flex-col gap-3">
                  {permissions?.download && (
                    <a
                      href={`${API_BASE}/shares/${token}/download`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition shadow-lg shadow-blue-200 text-[15px]"
                    >
                      <Download className="w-5 h-5" /> Download File
                    </a>
                  )}
                  <a
                    href={`${API_BASE}/shares/${token}/preview`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold rounded-2xl transition text-[15px]"
                  >
                    <Eye className="w-5 h-5" /> Preview
                  </a>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* Lightbox */}
      {lightboxFile && (
        <Lightbox
          file={lightboxFile}
          shareToken={token}
          files={allFiles.filter(f => isImage(f.mimeType, f.name) || isVideo(f.mimeType, f.name) || isAudio(f.mimeType, f.name))}
          onClose={() => setLightboxFile(null)}
        />
      )}
    </div>
  );
}

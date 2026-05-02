import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

const Dialog = ({ isOpen, title, children, onClose, confirmText = 'Confirm', onConfirm, isDestructive = false }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">{children}</div>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
              isDestructive
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export const CreateFolderDialog = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');

  const handleCreate = () => {
    if (name.trim()) {
      onCreate(name.trim());
      setName('');
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      title="Create Folder"
      onClose={() => {
        setName('');
        onClose();
      }}
      confirmText="Create"
      onConfirm={handleCreate}
    >
      <input
        type="text"
        placeholder="Folder name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
        autoFocus
        className="input-field"
      />
    </Dialog>
  );
};

export const RenameDialog = ({ isOpen, onClose, onRename, initialName = '' }) => {
  const [name, setName] = useState(initialName);

  const handleRename = () => {
    if (name.trim() && name !== initialName) {
      onRename(name.trim());
      setName('');
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      title="Rename"
      onClose={() => {
        setName('');
        onClose();
      }}
      confirmText="Rename"
      onConfirm={handleRename}
    >
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleRename()}
        autoFocus
        className="input-field"
      />
    </Dialog>
  );
};

export const DeleteConfirmDialog = ({ isOpen, onClose, onDelete, itemName = '' }) => {
  return (
    <Dialog
      isOpen={isOpen}
      title="Delete"
      onClose={onClose}
      confirmText="Delete"
      isDestructive
      onConfirm={onDelete}
    >
      <div className="flex gap-3">
        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
        <p className="text-sm text-gray-700">
          Are you sure you want to delete <strong>{itemName}</strong>? This action cannot be undone.
        </p>
      </div>
    </Dialog>
  );
};

export const ShareDialog = ({ isOpen, onClose, shareLink, onCopy }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (shareLink) {
      onCopy(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      title="Share File"
      onClose={onClose}
      confirmText={copied ? 'Copied!' : 'Copy Link'}
      onConfirm={handleCopy}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Share Link
          </label>
          <input
            type="text"
            readOnly
            value={shareLink || 'Generating...'}
            className="input-field bg-gray-50"
          />
        </div>
        <p className="text-xs text-gray-500">
          Anyone with this link can access the file
        </p>
      </div>
    </Dialog>
  );
};

export default Dialog;

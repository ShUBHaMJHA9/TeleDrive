import React, { useState, useEffect } from 'react';
import { useFileStore } from '../store';
import { fileAPI } from '../api/client';
import { ChevronRight, Home } from 'lucide-react';

const Breadcrumb = ({ currentFolderId, onNavigate }) => {
  const breadcrumbs = useFileStore((state) => state.breadcrumbs);

  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-200 bg-white">
      <button
        onClick={() => onNavigate('root')}
        className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
      >
        <Home className="w-4 h-4" />
        <span className="text-sm">Drive</span>
      </button>
      {breadcrumbs.slice(1).map((crumb, idx) => (
        <React.Fragment key={crumb.id}>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <button
            onClick={() => onNavigate(crumb.id)}
            className="text-sm text-gray-700 hover:text-gray-900"
          >
            {crumb.name}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};

export default Breadcrumb;

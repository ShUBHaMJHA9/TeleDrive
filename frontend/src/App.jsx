import React, { useEffect, useState } from 'react';
import { useAuthStore } from './store';
import { userAPI } from './api/client';
import { AuthScreen, PremiumFileManager } from './components';
import { Toaster } from 'react-hot-toast';

function App() {
  const { isAuthenticated, token, setUser, setToken, logout } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        setToken(savedToken);
        try {
          // Add timeout to prevent hanging
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const res = await userAPI.getProfile();
          clearTimeout(timeoutId);
          setUser(res.data);
        } catch (error) {
          console.error('Failed to fetch profile:', error.message);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [setToken, setUser, logout]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {isAuthenticated ? (
        <PremiumFileManager onLogout={logout} />
      ) : (
        <AuthScreen />
      )}
      <Toaster position="top-right" />
    </>
  );
}

export default App;

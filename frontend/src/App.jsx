import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store';
import { userAPI } from './api/client';
import { AuthScreen, PremiumFileManager, ProfessionalLoader } from './components';
import SharePage from './pages/SharePage';
import { Toaster } from 'react-hot-toast';


function MainApp() {
  const { isAuthenticated, token, setUser, setToken, logout } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        setToken(savedToken);
        try {
          const res = await userAPI.getProfile();
          setUser(res.data.user || res.data);
        } catch (error) {
          console.error('Failed to fetch profile:', error.message);
          if (error.response && error.response.status === 401) {
            logout();
          }
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [setToken, setUser, logout]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F8F9FC]">
        <ProfessionalLoader dark={false} />
      </div>
    );
  }

  return isAuthenticated ? (
    <PremiumFileManager onLogout={logout} />
  ) : (
    <AuthScreen />
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/share/:token" element={<SharePage />} />
        <Route path="/*" element={<MainApp />} />
      </Routes>
      <Toaster position="top-right" />
    </BrowserRouter>
  );
}

export default App;

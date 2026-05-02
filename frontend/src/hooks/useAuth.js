import { useAuthStore } from '../store';
import { authAPI } from '../api/client';
import toast from 'react-hot-toast';

export const useAuth = () => {
  const { user, token, isAuthenticated, setUser, setToken, setLoading, logout } = useAuthStore();

  const requestCode = async (phone, apiId, apiHash) => {
    try {
      setLoading(true);
      const res = await authAPI.requestCode(phone, apiId, apiHash);
      toast.success('Code sent to your Telegram');
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send code');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (phone, code) => {
    try {
      setLoading(true);
      const res = await authAPI.verifyCode(phone, code);
      setToken(res.data.token);
      setUser(res.data.user);
      toast.success('Logged in successfully!');
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to verify code');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
  };

  return { user, token, isAuthenticated, requestCode, verifyCode, logout: handleLogout };
};

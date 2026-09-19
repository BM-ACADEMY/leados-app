import { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { disablePush } from '../services/push.js';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('leados_token');
    const userData = localStorage.getItem('leados_user');
    if (token && userData) {
      setUser(JSON.parse(userData));
      api.setToken(token);
    }
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.login(email, password);
      setUser(data.user);
      localStorage.setItem('leados_user', JSON.stringify(data.user));
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await disablePush();
    setUser(null);
    api.clearToken();
    localStorage.removeItem('leados_user');
  };

  return { user, loading, error, login, logout };
};

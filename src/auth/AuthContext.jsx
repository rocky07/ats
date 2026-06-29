import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config';
import { initCognito, cognitoLogin, cognitoLogout, getCognitoCurrentSession } from './cognitoService';

const AuthContext = createContext(null);

const TOKEN_KEY = 'ats_token';

export function getStoredToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

function storeToken(token) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userSettings, setUserSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cognitoConfigured, setCognitoConfigured] = useState(false);

  // Bootstrap: fetch auth config from backend, then try to restore session
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/config`);
        const config = await res.json();
        setCognitoConfigured(config.cognitoConfigured);

        if (config.cognitoConfigured) {
          initCognito({ userPoolId: config.userPoolId, clientId: config.clientId });
          // Try to restore Cognito session
          try {
            const token = await getCognitoCurrentSession();
            storeToken(token);
            await fetchMe(token);
          } catch {
            storeToken(null);
          }
        } else {
          // Dev mode — restore from sessionStorage
          const stored = getStoredToken();
          if (stored) {
            try {
              await fetchMe(stored);
            } catch {
              storeToken(null);
            }
          }
        }
      } catch (err) {
        console.error('Auth bootstrap failed:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fetchMe = async (token) => {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch user');
    const data = await res.json();
    setUser(data.user);
    setUserSettings(data.settings);
    return data;
  };

  const login = useCallback(async (email, password) => {
    if (cognitoConfigured) {
      const { accessToken, payload } = await cognitoLogin(email, password);
      storeToken(accessToken);
      // JIT provision
      const provRes = await fetch(`${API_BASE_URL}/auth/provision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          cognitoSub: payload.sub,
          email: payload.email,
          name: payload.name ?? payload['cognito:username'],
          groups: payload['cognito:groups'] ?? [],
        }),
      });
      const data = await provRes.json();
      setUser(data.user);
      setUserSettings(data.settings);
    } else {
      // Dev login
      const res = await fetch(`${API_BASE_URL}/auth/dev-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Login failed');
      }
      const data = await res.json();
      storeToken(data.token);
      setUser(data.user);
      setUserSettings(data.settings);
    }
  }, [cognitoConfigured]);

  const logout = useCallback(() => {
    cognitoLogout();
    storeToken(null);
    setUser(null);
    setUserSettings(null);
  }, []);

  const refreshSettings = useCallback(async () => {
    const token = getStoredToken();
    if (!token) return;
    const res = await fetch(`${API_BASE_URL}/settings/user`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setUserSettings(await res.json());
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      userSettings,
      setUserSettings,
      loading,
      cognitoConfigured,
      login,
      logout,
      refreshSettings,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

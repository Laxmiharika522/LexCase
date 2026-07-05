import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, formatApiError } from "@/lib/apiClient";

const AuthContext = createContext(null);
const AUTH_VERSION = "2";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null=checking, object=user, false=guest
  const [loading, setLoading] = useState(true);

  const clearToken = () => {
    localStorage.removeItem("access_token");
    delete api.defaults.headers.common["Authorization"];
  };

  const persistToken = (token) => {
    localStorage.setItem("access_token", token);
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  };

  const refresh = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      clearToken();
      setUser(false);
      setLoading(false);
      return;
    }
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      clearToken();
      setUser(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem("lexcase_auth_version") !== AUTH_VERSION) {
      localStorage.removeItem("access_token");
      localStorage.setItem("lexcase_auth_version", AUTH_VERSION);
    }
    refresh();
  }, [refresh]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    persistToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    persistToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (e) {
      // ignore
    }
    clearToken();
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh, formatApiError }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

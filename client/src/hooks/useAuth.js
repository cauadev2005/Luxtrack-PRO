import { useState } from "react";
import { request } from "../api.js";

const AUTH_STORAGE_KEY = "luxtrack-auth";

export function useAuth() {
  const [auth, setAuth] = useState(() => {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState("");

  async function login(profile) {
    setLoginBusy(true);
    setLoginError("");
    try {
      const data = await request("/auth/login", {
        method: "POST",
        body: {
          email: profile.email,
          password: profile.password,
          role: profile.role
        }
      });
      setAuth(data);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
      return data;
    } catch (error) {
      setLoginError(error.message);
      return null;
    } finally {
      setLoginBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuth(null);
  }

  return {
    auth,
    login,
    logout,
    loginBusy,
    loginError
  };
}

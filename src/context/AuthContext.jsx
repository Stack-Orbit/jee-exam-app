import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for user data passed via URL parameters (cross-origin auth handoff)
    const urlParams = new URLSearchParams(window.location.search);
    const userParam = urlParams.get('user');
    
    if (userParam) {
      try {
        const decodedUser = JSON.parse(decodeURIComponent(userParam));
        localStorage.setItem('airlab_user', JSON.stringify(decodedUser));
        setCurrentUser(decodedUser);
        
        // Clean up the URL
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({path: newUrl}, '', newUrl);
        setLoading(false);
        return;
      } catch (e) {
        console.error("Failed to parse user from URL");
      }
    }

    // Check local storage for user data
    const savedUser = localStorage.getItem('airlab_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse user data");
      }
    }
    setLoading(false);
  }, []);

  const logout = () => {
    localStorage.removeItem('airlab_user');
    setCurrentUser(null);
    // Redirect back to login page
    window.location.href = "/login";
  };

  const login = (userData) => {
    localStorage.setItem('airlab_user', JSON.stringify(userData));
    setCurrentUser(userData);
  }

  const value = {
    currentUser,
    logout,
    login
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

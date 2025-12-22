import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { storageService } from '../services/storage';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => { success: boolean; message?: string };
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => ({ success: false }),
  logout: () => {},
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check local storage for persistent login session simulation
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = (email: string, password: string) => {
    const users = storageService.getUsers();
    const found = users.find(u => u.email === email);
    
    if (!found) {
      return { success: false, message: 'User not found' };
    }

    if (!found.isActive) {
      return { success: false, message: 'Account is deactivated. Contact Admin.' };
    }

    if (found.password !== password) {
      return { success: false, message: 'Invalid credentials' };
    }

    setUser(found);
    localStorage.setItem('currentUser', JSON.stringify(found));
    storageService.logAction(found.id, 'User Logged In');
    return { success: true };
  };

  const logout = () => {
    if (user) {
      storageService.logAction(user.id, 'User Logged Out');
    }
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
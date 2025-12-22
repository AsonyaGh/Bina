
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { storageService } from '../services/storage';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => ({ success: false }),
  logout: () => {},
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
        // Check local storage for persistent login session simulation
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          // Verify user still exists in DB
          try {
             const users = await storageService.getUsers();
             const found = users.find(u => u.id === parsedUser.id);
             if (found && found.isActive) {
                 setUser(found);
             } else {
                 localStorage.removeItem('currentUser');
             }
          } catch (e) {
              console.error("Auth verification failed", e);
          }
        }
        setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
        const users = await storageService.getUsers();
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
        await storageService.logAction(found.id, 'User Logged In');
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, message: "Network or Database Error" };
    }
  };

  const logout = () => {
    if (user) {
      storageService.logAction(user.id, 'User Logged Out').catch(console.error);
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

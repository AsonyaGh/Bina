import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, RefreshCw } from 'lucide-react';
import { storageService } from '../services/storage';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    const result = await login(email, password);
    
    if (!result.success) {
      setError(result.message || 'Login failed');
      setIsSubmitting(false);
    }
  };

  const handleReset = async () => {
    if (confirm("Check connection and re-seed database if empty?")) {
      await storageService.init();
      location.reload();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="bg-red-600 p-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">BINA WOO</h1>
          <p className="text-red-100">MotoManager System</p>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-gray-700 text-white placeholder-gray-400"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-gray-700 text-white placeholder-gray-400"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-sm bg-red-50 dark:bg-red-900/30 p-2 rounded text-center">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition duration-200 ${isSubmitting ? 'opacity-70 cursor-wait' : ''}`}
              title="Sign In"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
            
            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center space-y-2">
              <p>Default Password: <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">123456</span></p>
              <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                <p className="font-semibold mb-1">Demo Accounts:</p>
                <p>Admin: admin@binawoo.com</p>
                <p>Warehouse: warehouse@binawoo.com</p>
                <p>Branch: branch1@binawoo.com</p>
              </div>
            </div>
          </form>
          
          <div className="mt-8 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-center">
            <button 
              onClick={handleReset}
              className="flex items-center text-xs text-gray-400 hover:text-red-500 transition-colors"
              title="Reset Database"
            >
              <RefreshCw size={12} className="mr-1" />
              Check/Seed Database
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import { 
  LayoutDashboard, 
  Bike, 
  ArrowRightLeft, 
  DollarSign, 
  Users, 
  FileText, 
  LogOut, 
  Menu, 
  X,
  Moon,
  Sun,
  Warehouse,
  Store
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  setActivePage: (page: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activePage, setActivePage }) => {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: [Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.BRANCH_MANAGER, Role.SALES_OFFICER] },
    { id: 'warehouses', label: 'Warehouses', icon: Warehouse, roles: [Role.ADMIN, Role.WAREHOUSE_MANAGER] },
    { id: 'branches', label: 'Branches', icon: Store, roles: [Role.ADMIN, Role.BRANCH_MANAGER] },
    { id: 'inventory', label: 'All Inventory', icon: Bike, roles: [Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.BRANCH_MANAGER] },
    { id: 'transfers', label: 'Transfers', icon: ArrowRightLeft, roles: [Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.BRANCH_MANAGER] },
    { id: 'sales', label: 'Sales', icon: DollarSign, roles: [Role.ADMIN, Role.BRANCH_MANAGER, Role.SALES_OFFICER] },
    { id: 'users', label: 'User Management', icon: Users, roles: [Role.ADMIN] },
    { id: 'reports', label: 'Reports & Logs', icon: FileText, roles: [Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.BRANCH_MANAGER] },
  ];

  const filteredMenu = menuItems.filter(item => user && item.roles.includes(user.role));

  return (
    <div className={`min-h-screen flex bg-gray-50 dark:bg-gray-900 ${darkMode ? 'dark' : ''}`}>
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-200 ease-in-out
        lg:translate-x-0 lg:static lg:inset-auto
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-6 bg-red-600 text-white">
          <span className="text-xl font-bold tracking-wider">BINA WOO</span>
          <button 
            onClick={() => setSidebarOpen(false)} 
            className="lg:hidden text-white"
            title="Close Menu"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-col h-[calc(100%-4rem)] justify-between">
          <nav className="p-4 space-y-2">
            {filteredMenu.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActivePage(item.id);
                  setSidebarOpen(false);
                }}
                title={item.label}
                className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors ${
                  activePage === item.id 
                    ? 'bg-red-50 text-red-600 dark:bg-gray-700 dark:text-red-400 font-medium' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <item.icon size={20} className="mr-3" />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
             <div className="flex items-center mb-4 px-4 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{user?.name}</p>
                    <p className="text-xs truncate">{user?.role}</p>
                </div>
             </div>
             
             <button 
               onClick={toggleDarkMode}
               title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
               className="flex items-center w-full px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg mb-2"
             >
                {darkMode ? <Sun size={18} className="mr-3" /> : <Moon size={18} className="mr-3" />}
                {darkMode ? 'Light Mode' : 'Dark Mode'}
             </button>

            <button 
              onClick={logout}
              title="Sign Out"
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-gray-700 rounded-lg"
            >
              <LogOut size={18} className="mr-3" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between h-16 px-6 bg-white dark:bg-gray-800 shadow-sm lg:hidden">
          <button 
            onClick={() => setSidebarOpen(true)} 
            className="text-gray-600 dark:text-gray-200"
            title="Open Menu"
          >
            <Menu size={24} />
          </button>
          <span className="text-lg font-bold text-gray-800 dark:text-white">Bina Woo</span>
          <div className="w-6"></div> {/* Spacer */}
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
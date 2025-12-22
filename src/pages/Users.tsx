
import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import { User, Role, Location } from '../types';
import { Plus, Trash2, Edit2, Key, UserX, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Users: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>(Role.SALES_OFFICER);
  const [locationId, setLocationId] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setLoading(true);
    try {
        const [u, l] = await Promise.all([
            storageService.getUsers(),
            storageService.getLocations()
        ]);
        setUsers(u);
        setLocations(l);
    } catch(e) { console.error(e) }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to PERMANENTLY delete this user? This cannot be undone.')) {
      await storageService.deleteUser(id);
      refreshData();
    }
  };

  const handleToggleActive = async (userToToggle: User) => {
    const action = userToToggle.isActive ? 'deactivate' : 'activate';
    if (confirm(`Are you sure you want to ${action} this user?`)) {
      const updatedUser = { ...userToToggle, isActive: !userToToggle.isActive };
      await storageService.updateUser(updatedUser);
      refreshData();
    }
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setSelectedUser(null);
    setName('');
    setEmail('');
    setRole(Role.SALES_OFFICER);
    setLocationId('');
    setPassword('');
    setShowModal(true);
  };

  const openEditModal = (u: User) => {
    setIsEditing(true);
    setSelectedUser(u);
    setName(u.name);
    setEmail(u.email);
    setRole(u.role);
    setLocationId(u.locationId || '');
    setPassword(''); // Don't show password on edit
    setShowModal(true);
  };

  const openResetModal = (u: User) => {
    setSelectedUser(u);
    setPassword('');
    setShowResetModal(true);
  }

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEditing && selectedUser) {
      const updatedUser: User = {
        ...selectedUser,
        name,
        email,
        role,
        locationId: locationId || undefined
      };
      await storageService.updateUser(updatedUser);
      await storageService.logAction(currentUser?.id || 'admin', `Updated user details for ${email}`);
    } else {
      const newUser: User = {
        id: `u_${Date.now()}`,
        name,
        email,
        role,
        password: password, // Required for new users in this mock auth scheme
        locationId: locationId || undefined,
        isActive: true
      };
      await storageService.addUser(newUser);
      await storageService.logAction(currentUser?.id || 'admin', `Created user ${email}`);
    }
    
    await refreshData();
    setShowModal(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser && password) {
      const updatedUser = { ...selectedUser, password: password };
      await storageService.updateUser(updatedUser);
      await storageService.logAction(currentUser?.id || 'admin', `Reset password for ${selectedUser.email}`);
      setShowResetModal(false);
      refreshData();
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">User Management</h1>
        <button 
          onClick={openCreateModal}
          className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
          title="Create New User"
        >
          <Plus size={18} className="mr-2" />
          Add User
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Location</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (<tr><td colSpan={6} className="p-4 text-center">Loading users...</td></tr>) : users.map(u => (
              <tr key={u.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${!u.isActive ? 'opacity-60 bg-gray-50 dark:bg-gray-800' : ''}`}>
                <td className="px-6 py-4 font-medium dark:text-white">{u.name}</td>
                <td className="px-6 py-4 dark:text-gray-300">{u.email}</td>
                <td className="px-6 py-4 dark:text-gray-300">
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">{u.role}</span>
                </td>
                <td className="px-6 py-4 dark:text-gray-300">{locations.find(l => l.id === u.locationId)?.name || '-'}</td>
                <td className="px-6 py-4">
                  {u.isActive ? 
                    <span className="text-green-600 text-xs font-bold border border-green-200 bg-green-50 px-2 py-1 rounded">Active</span> : 
                    <span className="text-red-600 text-xs font-bold border border-red-200 bg-red-50 px-2 py-1 rounded">Inactive</span>
                  }
                </td>
                <td className="px-6 py-4 flex items-center gap-2">
                  <button onClick={() => openEditModal(u)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Edit User">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => openResetModal(u)} className="p-1 text-orange-600 hover:bg-orange-50 rounded" title="Reset Password">
                    <Key size={18} />
                  </button>
                  <button onClick={() => handleToggleActive(u)} className={`p-1 rounded ${u.isActive ? 'text-gray-500 hover:text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`} title={u.isActive ? "Deactivate User" : "Activate User"}>
                    {u.isActive ? <UserX size={18} /> : <UserCheck size={18} />}
                  </button>
                  <button onClick={() => handleDelete(u.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Delete User Permanently">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4 dark:text-white">{isEditing ? 'Edit User' : 'Create New User'}</h2>
            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Full Name</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border border-gray-600 rounded-lg bg-gray-700 text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Email</label>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 border border-gray-600 rounded-lg bg-gray-700 text-white" />
              </div>
              
              {!isEditing && (
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Password</label>
                  <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2 border border-gray-600 rounded-lg bg-gray-700 text-white" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Role</label>
                <select value={role} onChange={e => setRole(e.target.value as Role)} className="w-full p-2 border border-gray-600 rounded-lg bg-gray-700 text-white">
                  {(Object.values(Role) as string[]).map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Assigned Branch/Warehouse</label>
                <select value={locationId} onChange={e => setLocationId(e.target.value)} className="w-full p-2 border border-gray-600 rounded-lg bg-gray-700 text-white">
                  <option value="">None (Admin)</option>
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>{l.name} ({l.type})</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                  {isEditing ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-xl font-bold mb-4 dark:text-white">Reset Password</h2>
            <p className="text-sm text-gray-500 mb-4">Set a new password for {selectedUser?.name}</p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">New Password</label>
                <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2 border border-gray-600 rounded-lg bg-gray-700 text-white" />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                 <button type="button" onClick={() => setShowResetModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                 <button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">Reset Password</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
    
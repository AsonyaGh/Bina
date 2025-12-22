import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import { Motorcycle, MotorcycleStatus, Role, Location } from '../types';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, Filter, Edit2, Trash2, X } from 'lucide-react';

export const Inventory: React.FC = () => {
  const { user } = useAuth();
  const [bikes, setBikes] = useState<Motorcycle[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [filterText, setFilterText] = useState('');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Form State
  const [editingBike, setEditingBike] = useState<Motorcycle | null>(null);
  const [newChassis, setNewChassis] = useState('');
  const [newType, setNewType] = useState('');
  const [newColor, setNewColor] = useState('');
  const [targetLocationId, setTargetLocationId] = useState('');

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setBikes(storageService.getMotorcycles());
    setLocations(storageService.getLocations());
  };

  const handleAddBike = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Determine import location
    let importLocationId = user.locationId;
    
    // If Admin, they must select a location
    if (user.role === Role.ADMIN) {
      if (!targetLocationId) {
        alert("Please select a target warehouse.");
        return;
      }
      importLocationId = targetLocationId;
    }

    if (!importLocationId) {
      alert("No valid warehouse location found for import.");
      return;
    }

    const newBike: Motorcycle = {
      chassisNumber: newChassis,
      type: newType,
      color: newColor,
      status: MotorcycleStatus.IN_WAREHOUSE,
      currentLocationId: importLocationId,
      importDate: new Date().toISOString()
    };
    storageService.addMotorcycle(newBike);
    refreshData();
    setShowAddModal(false);
    resetForm();
  };

  const handleEditBike = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBike || !user) return;

    const updatedBike = {
        ...editingBike,
        type: newType,
        color: newColor
    };
    
    storageService.updateMotorcycle(updatedBike);
    storageService.logAction(user.id, `Updated details for bike ${editingBike.chassisNumber}`);
    
    refreshData();
    setShowEditModal(false);
    resetForm();
  };

  const handleDeleteBike = (chassisNumber: string) => {
    if (confirm(`Are you sure you want to delete bike ${chassisNumber}? This action cannot be undone.`)) {
        storageService.deleteMotorcycle(chassisNumber);
        storageService.logAction(user?.id || 'system', `Deleted bike ${chassisNumber}`);
        refreshData();
    }
  };

  const openEditModal = (bike: Motorcycle) => {
    setEditingBike(bike);
    setNewChassis(bike.chassisNumber);
    setNewType(bike.type);
    setNewColor(bike.color);
    setShowEditModal(true);
  };

  const resetForm = () => {
    setNewChassis('');
    setNewType('');
    setNewColor('');
    setTargetLocationId('');
    setEditingBike(null);
  }

  const filteredBikes = bikes.filter(b => {
    const matchesText = b.chassisNumber.toLowerCase().includes(filterText.toLowerCase()) || 
                        b.type.toLowerCase().includes(filterText.toLowerCase());
    
    // Role based filtering
    if (user?.role === Role.ADMIN) return matchesText;
    if (user?.locationId) return matchesText && b.currentLocationId === user.locationId;
    return matchesText;
  });

  const getLocationName = (id: string) => {
    const loc = locations.find(l => l.id === id);
    return loc ? loc.name : id;
  };

  const canEdit = user?.role === Role.ADMIN || user?.role === Role.WAREHOUSE_MANAGER;
  const canDelete = user?.role === Role.ADMIN;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Motorcycle Inventory</h1>
        {(user?.role === Role.ADMIN || user?.role === Role.WAREHOUSE_MANAGER) && (
          <button 
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            title="Import New Motorcycle"
          >
            <Plus size={18} className="mr-2" />
            Import Motorcycle
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex items-center space-x-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search Chassis Number or Type..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-red-500 placeholder-gray-400"
          />
        </div>
        <button 
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            title="Filter Options"
        >
          <Filter size={20} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              <tr>
                <th className="px-6 py-4 font-medium">Chassis Number</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Color</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Location</th>
                <th className="px-6 py-4 font-medium">Import Date</th>
                {(canEdit || canDelete) && <th className="px-6 py-4 font-medium text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredBikes.map((bike) => (
                <tr key={bike.chassisNumber} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{bike.chassisNumber}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{bike.type}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{bike.color}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${bike.status === MotorcycleStatus.IN_WAREHOUSE ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' : ''}
                      ${bike.status === MotorcycleStatus.AT_BRANCH ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' : ''}
                      ${bike.status === MotorcycleStatus.IN_TRANSIT ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' : ''}
                      ${bike.status === MotorcycleStatus.SOLD ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : ''}
                    `}>
                      {bike.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{getLocationName(bike.currentLocationId)}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{new Date(bike.importDate).toLocaleDateString()}</td>
                  {(canEdit || canDelete) && (
                      <td className="px-6 py-4 flex items-center justify-center gap-2">
                        {canEdit && (
                            <button onClick={() => openEditModal(bike)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Edit Details">
                                <Edit2 size={16} />
                            </button>
                        )}
                        {canDelete && (
                            <button onClick={() => handleDeleteBike(bike.chassisNumber)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Delete Stock">
                                <Trash2 size={16} />
                            </button>
                        )}
                      </td>
                  )}
                </tr>
              ))}
              {filteredBikes.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No motorcycles found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Import Motorcycle</h2>
            <form onSubmit={handleAddBike} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chassis Number</label>
                <input required type="text" value={newChassis} onChange={e => setNewChassis(e.target.value)} className="w-full p-2 border border-gray-600 rounded-lg bg-gray-700 text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type/Model</label>
                <input required type="text" value={newType} onChange={e => setNewType(e.target.value)} className="w-full p-2 border border-gray-600 rounded-lg bg-gray-700 text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
                <input required type="text" value={newColor} onChange={e => setNewColor(e.target.value)} className="w-full p-2 border border-gray-600 rounded-lg bg-gray-700 text-white" />
              </div>
              
              {user?.role === Role.ADMIN && (
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Warehouse</label>
                    <select 
                      required 
                      value={targetLocationId} 
                      onChange={e => setTargetLocationId(e.target.value)} 
                      className="w-full p-2 border border-gray-600 rounded-lg bg-gray-700 text-white"
                    >
                      <option value="">Select Warehouse</option>
                      {locations.filter(l => l.type === 'WAREHOUSE').map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                 </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Save & Import</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingBike && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Edit Stock Details</h2>
            <form onSubmit={handleEditBike} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chassis Number</label>
                <input disabled type="text" value={newChassis} className="w-full p-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-400 cursor-not-allowed" />
                <p className="text-xs text-gray-500 mt-1">Chassis number cannot be changed once imported.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type/Model</label>
                <input required type="text" value={newType} onChange={e => setNewType(e.target.value)} className="w-full p-2 border border-gray-600 rounded-lg bg-gray-700 text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
                <input required type="text" value={newColor} onChange={e => setNewColor(e.target.value)} className="w-full p-2 border border-gray-600 rounded-lg bg-gray-700 text-white" />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Update Details</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
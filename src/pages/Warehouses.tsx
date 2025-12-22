
import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import { Location, Role, MotorcycleStatus, Motorcycle } from '../types';
import { useAuth } from '../context/AuthContext';
import { Plus, Warehouse, Trash2, Edit2, Eye, X } from 'lucide-react';

export const Warehouses: React.FC = () => {
  const { user } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [bikes, setBikes] = useState<Motorcycle[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Add/Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  // View Stock Modal State
  const [showStockModal, setShowStockModal] = useState(false);
  const [warehouseBikes, setWarehouseBikes] = useState<Motorcycle[]>([]);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setLoading(true);
    try {
        const [l, b] = await Promise.all([
            storageService.getLocations(),
            storageService.getMotorcycles()
        ]);
        setLocations(l.filter(loc => loc.type === 'WAREHOUSE'));
        setBikes(b);
    } catch(e) { console.error(e) }
    finally { setLoading(false); }
  };

  const openAddModal = () => {
    setIsEditing(false);
    setSelectedLocation(null);
    setName('');
    setAddress('');
    setShowModal(true);
  };

  const openEditModal = (loc: Location) => {
    setIsEditing(true);
    setSelectedLocation(loc);
    setName(loc.name);
    setAddress(loc.address);
    setShowModal(true);
  };

  const openStockModal = (loc: Location) => {
    setSelectedLocation(loc);
    const stock = bikes.filter(b => b.currentLocationId === loc.id && b.status === MotorcycleStatus.IN_WAREHOUSE);
    setWarehouseBikes(stock);
    setShowStockModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && selectedLocation) {
        const updatedLoc: Location = {
            ...selectedLocation,
            name,
            address
        };
        await storageService.updateLocation(updatedLoc);
        await storageService.logAction(user?.id || 'system', `Updated warehouse ${name}`);
    } else {
        const newLoc: Location = {
            id: `loc_wh_${Date.now()}`,
            name,
            type: 'WAREHOUSE',
            address
        };
        await storageService.addLocation(newLoc);
        await storageService.logAction(user?.id || 'system', `Created warehouse ${name}`);
    }
    await refreshData();
    setShowModal(false);
  };

  const getStockCount = (id: string) => {
    return bikes.filter(b => b.currentLocationId === id && b.status === MotorcycleStatus.IN_WAREHOUSE).length;
  };

  const handleDelete = async (id: string) => {
      if(confirm("Are you sure you want to delete this warehouse?")) {
          await storageService.deleteLocation(id);
          refreshData();
      }
  }

  if (loading) return <div className="p-6">Loading warehouses...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Warehouses</h1>
        {user?.role === Role.ADMIN && (
          <button 
            onClick={openAddModal}
            className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
            title="Add New Warehouse"
          >
            <Plus size={18} className="mr-2" />
            Add Warehouse
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {locations.map(loc => (
          <div key={loc.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 relative group">
            <div className="flex items-start justify-between">
              <div className="p-3 bg-blue-50 dark:bg-blue-900 rounded-lg text-blue-600 dark:text-blue-300">
                <Warehouse size={24} />
              </div>
               {user?.role === Role.ADMIN && (
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={() => openEditModal(loc)} className="text-gray-400 hover:text-blue-500" title="Edit Warehouse Details">
                        <Edit2 size={18}/>
                     </button>
                     <button onClick={() => handleDelete(loc.id)} className="text-gray-400 hover:text-red-500" title="Delete Warehouse">
                        <Trash2 size={18}/>
                     </button>
                  </div>
              )}
            </div>
            <h3 className="mt-4 text-lg font-bold text-gray-800 dark:text-white">{loc.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{loc.address}</p>
            
            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-gray-600 dark:text-gray-300">Current Stock</span>
                <span className="text-xl font-bold text-gray-800 dark:text-white">{getStockCount(loc.id)}</span>
              </div>
               {user?.role === Role.ADMIN && (
                <button 
                  onClick={() => openStockModal(loc)}
                  className="w-full py-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium flex items-center justify-center transition-colors"
                  title="View Warehouse Stock"
                >
                  <Eye size={16} className="mr-2" />
                  View Stock
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4 dark:text-white">{isEditing ? 'Edit Warehouse' : 'Add Warehouse'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Warehouse Name</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border border-gray-600 rounded-lg bg-gray-700 text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Address</label>
                <input required type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full p-2 border border-gray-600 rounded-lg bg-gray-700 text-white" />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">{isEditing ? 'Save Changes' : 'Add Warehouse'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Stock Modal */}
      {showStockModal && selectedLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl p-6 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-4 border-b pb-4 dark:border-gray-700">
               <div>
                 <h2 className="text-xl font-bold dark:text-white">Stock at {selectedLocation.name}</h2>
                 <p className="text-sm text-gray-500">{warehouseBikes.length} Motorcycles Available</p>
               </div>
               <button onClick={() => setShowStockModal(false)} className="text-gray-500 hover:text-gray-700" title="Close">
                 <X size={24} />
               </button>
            </div>
            
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-sm font-medium text-gray-500">Chassis Number</th>
                    <th className="px-4 py-2 text-sm font-medium text-gray-500">Type</th>
                    <th className="px-4 py-2 text-sm font-medium text-gray-500">Color</th>
                    <th className="px-4 py-2 text-sm font-medium text-gray-500">Import Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {warehouseBikes.map(bike => (
                    <tr key={bike.chassisNumber}>
                      <td className="px-4 py-2 dark:text-white">{bike.chassisNumber}</td>
                      <td className="px-4 py-2 dark:text-gray-300">{bike.type}</td>
                      <td className="px-4 py-2 dark:text-gray-300">{bike.color}</td>
                      <td className="px-4 py-2 dark:text-gray-300">{new Date(bike.importDate).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {warehouseBikes.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-gray-500">No stock currently available at this warehouse.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

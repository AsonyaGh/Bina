import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import { Sale, Motorcycle, MotorcycleStatus, Role } from '../types';
import { useAuth } from '../context/AuthContext';
import { Plus, Info, Edit2, Trash2, X } from 'lucide-react';

export const Sales: React.FC = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [availableBikes, setAvailableBikes] = useState<Motorcycle[]>([]);

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);

  // Form
  const [selectedBike, setSelectedBike] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [price, setPrice] = useState('');

  useEffect(() => {
    refreshData();
  }, [user]);

  const refreshData = () => {
    setSales(storageService.getSales());
    // Filter bikes that are AT_BRANCH and specifically at THIS user's branch
    if (user?.locationId) {
      const allBikes = storageService.getMotorcycles();
      setAvailableBikes(allBikes.filter(b => 
        b.currentLocationId === user.locationId && b.status === MotorcycleStatus.AT_BRANCH
      ));
    }
  };

  const openNewSaleModal = () => {
      setIsEditing(false);
      setEditingSaleId(null);
      setSelectedBike('');
      setCustomerName('');
      setCustomerPhone('');
      setPrice('');
      setShowModal(true);
  };

  const openEditModal = (sale: Sale) => {
      setIsEditing(true);
      setEditingSaleId(sale.id);
      setSelectedBike(sale.chassisNumber);
      setCustomerName(sale.customerName);
      setCustomerPhone(sale.customerPhone);
      setPrice(sale.price.toString());
      setShowModal(true);
  };

  const handleDelete = (id: string) => {
      if(confirm("Are you sure you want to delete this sale? The bike will be returned to inventory.")) {
          storageService.deleteSale(id);
          storageService.logAction(user?.id || 'system', `Deleted sale record ${id}`);
          refreshData();
      }
  };

  const handleSaleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (isEditing && editingSaleId) {
        // Update existing sale
        // We find the original sale to preserve fields we aren't editing in the UI (like dates)
        const originalSale = sales.find(s => s.id === editingSaleId);
        if (!originalSale) return;

        const updatedSale: Sale = {
            ...originalSale,
            customerName,
            customerPhone,
            price: Number(price),
            // We typically don't allow changing the bike (chassisNumber) easily in edit 
            // without complex logic of swapping bike statuses. 
            // For this version, assume bike stays same.
        };
        storageService.updateSale(updatedSale);
        storageService.logAction(user.id, `Updated sale details for ${customerName}`);

    } else {
        // Create new sale
        if (!user.locationId) return;
        const newSale: Sale = {
            id: `sale_${Date.now()}`,
            chassisNumber: selectedBike,
            customerName,
            customerPhone,
            price: Number(price),
            salesOfficerId: user.id,
            branchId: user.locationId,
            date: new Date().toISOString()
        };
        storageService.createSale(newSale);
        storageService.logAction(user.id, `Sold bike ${selectedBike} to ${customerName}`);
    }

    refreshData();
    setShowModal(false);
    // Reset form
    setSelectedBike('');
    setCustomerName('');
    setCustomerPhone('');
    setPrice('');
  };

  const filteredSales = sales.filter(s => {
      if (user?.role === Role.ADMIN) return true;
      if (user?.role === Role.SALES_OFFICER) return s.salesOfficerId === user.id;
      return s.branchId === user?.locationId;
  });

  const canManageSale = (sale: Sale) => {
      if (user?.role === Role.ADMIN) return true;
      if (user?.role === Role.BRANCH_MANAGER && sale.branchId === user.locationId) return true;
      return false;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Sales Records</h1>
        {(user?.role === Role.SALES_OFFICER || user?.role === Role.BRANCH_MANAGER) && (
          <button 
            onClick={openNewSaleModal}
            className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
            title="Record New Sale"
          >
            <Plus size={18} className="mr-2" />
            New Sale
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Chassis Number</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4 text-right">Price (GHS)</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredSales.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 dark:text-gray-300">{new Date(s.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-medium dark:text-white">{s.chassisNumber}</td>
                  <td className="px-6 py-4 dark:text-gray-300">{s.customerName}</td>
                  <td className="px-6 py-4 dark:text-gray-300">{s.customerPhone}</td>
                  <td className="px-6 py-4 text-right font-medium text-green-600 dark:text-green-400">
                    ₵{s.price.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex justify-center gap-2">
                        {canManageSale(s) ? (
                            <>
                                <button onClick={() => openEditModal(s)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Edit Customer Details">
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDelete(s.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Delete & Revert Stock">
                                    <Trash2 size={16} />
                                </button>
                            </>
                        ) : (
                            <span className="text-gray-300 text-xs">-</span>
                        )}
                     </div>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                   <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No sales records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4 dark:text-white">{isEditing ? 'Edit Sale Details' : 'Record New Sale'}</h2>
            <form onSubmit={handleSaleSubmit} className="space-y-4">
              
              {!isEditing && (
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Motorcycle</label>
                    {availableBikes.length > 0 ? (
                      <select 
                        required 
                        value={selectedBike} 
                        onChange={e => setSelectedBike(e.target.value)}
                        className="w-full p-2 border border-gray-600 rounded-lg bg-gray-700 text-white"
                      >
                        <option value="">Select Motorcycle</option>
                        {availableBikes.map(b => (
                          <option key={b.chassisNumber} value={b.chassisNumber}>{b.chassisNumber} - {b.type}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-lg text-sm flex items-start">
                        <Info size={16} className="mt-0.5 mr-2 shrink-0" />
                        <p>No motorcycles available for sale at this branch.</p>
                      </div>
                    )}
                  </div>
              )}

              {isEditing && (
                  <div>
                      <label className="block text-sm font-medium mb-1 dark:text-gray-300">Motorcycle (Fixed)</label>
                      <input type="text" value={selectedBike} disabled className="w-full p-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-400 cursor-not-allowed" />
                  </div>
              )}
              
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Customer Name</label>
                <input required type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full p-2 border border-gray-600 rounded-lg bg-gray-700 text-white" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Phone Number</label>
                <input required type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full p-2 border border-gray-600 rounded-lg bg-gray-700 text-white" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Sale Price (GHS)</label>
                <input required type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full p-2 border border-gray-600 rounded-lg bg-gray-700 text-white" />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button 
                    type="submit" 
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700" 
                    disabled={!isEditing && availableBikes.length === 0}
                >
                    {isEditing ? 'Save Changes' : 'Record Sale'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
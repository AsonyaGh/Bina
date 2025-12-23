import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import { Transfer, TransferStatus, Role, Location, Motorcycle, MotorcycleStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { Plus, Check, ArrowRight, XCircle, ShieldCheck, RefreshCw, Truck } from 'lucide-react';

export const Transfers: React.FC = () => {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // New Transfer Form
  const [selectedFromLocation, setSelectedFromLocation] = useState('');
  const [selectedToLocation, setSelectedToLocation] = useState('');
  const [selectedBikes, setSelectedBikes] = useState<string[]>([]);
  const [availableBikes, setAvailableBikes] = useState<Motorcycle[]>([]);

  useEffect(() => {
    // 1. Subscribe to Transfers (Real-time)
    const unsubscribeTransfers = storageService.subscribeToTransfers((data) => {
        setTransfers(data);
        setLoading(false);
    });

    // 2. Fetch Locations (Static enough to fetch once)
    storageService.getLocations().then(setLocations);

    // Pre-select Origin for Managers
    if ((user?.role === Role.WAREHOUSE_MANAGER || user?.role === Role.BRANCH_MANAGER) && user?.locationId) {
        setSelectedFromLocation(user.locationId);
    }

    return () => unsubscribeTransfers();
  }, [user]);

  // Update available bikes when FROM location changes
  useEffect(() => {
    const loadBikes = async () => {
        if (selectedFromLocation && user) {
            const allBikes = await storageService.getMotorcycles();
            
            const loc = locations.find(l => l.id === selectedFromLocation);
            const requiredStatus = loc?.type === 'WAREHOUSE' ? MotorcycleStatus.IN_WAREHOUSE : MotorcycleStatus.AT_BRANCH;

            setAvailableBikes(allBikes.filter(b => 
                b.currentLocationId === selectedFromLocation && b.status === requiredStatus
            ));
        }
    };
    loadBikes();
  }, [selectedFromLocation, user, locations]);

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const fromId = (user.role === Role.ADMIN) ? selectedFromLocation : user.locationId;
    if (!fromId || !selectedToLocation || selectedBikes.length === 0) return;

    let initialStatus = TransferStatus.PENDING; // Default to "In Transit"
    
    // If Branch Manager initiates, it requires approval
    if (user.role === Role.BRANCH_MANAGER) {
        initialStatus = TransferStatus.PENDING_APPROVAL;
    }

    const newTransfer: Transfer = {
      id: `tr_${Date.now()}`,
      reference: `TR-${Math.floor(Math.random() * 10000)}`,
      fromLocationId: fromId,
      toLocationId: selectedToLocation,
      chassisNumbers: selectedBikes,
      status: initialStatus,
      initiatedBy: user.id,
      dateInitiated: new Date().toISOString()
    };

    await storageService.createTransfer(newTransfer);
    await storageService.logAction(user.id, `Created transfer ${newTransfer.reference}`);
    
    setShowModal(false);
    setSelectedBikes([]);
    if (user.role === Role.ADMIN) setSelectedFromLocation('');
    setSelectedToLocation('');
  };

  const handleReceive = async (transferId: string) => {
    if (!user) return;
    if(confirm("Confirm that you have received these items? This will update inventory.")) {
        await storageService.completeTransfer(transferId, user.id);
        await storageService.logAction(user.id, `Received & Approved transfer ${transferId}`);
    }
  };

  const handleApprove = async (transferId: string) => {
      if (!user) return;
      await storageService.approveTransfer(transferId, user.id);
      await storageService.logAction(user.id, `Approved transfer ${transferId}`);
  };

  const handleCancel = async (transferId: string) => {
      if (!user) return;
      if (confirm("Are you sure you want to cancel this transfer? Bikes will be returned to the origin inventory.")) {
          await storageService.cancelTransfer(transferId, user.id);
          await storageService.logAction(user.id, `Cancelled transfer ${transferId}`);
      }
  };

  const getLocationName = (id: string) => locations.find(l => l.id === id)?.name || id;

  const relevantTransfers = transfers.filter(t => {
    if (user?.role === Role.ADMIN) return true;
    return t.fromLocationId === user?.locationId || t.toLocationId === user?.locationId;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Stock Transfers</h1>
        {(user?.role === Role.WAREHOUSE_MANAGER || user?.role === Role.ADMIN || user?.role === Role.BRANCH_MANAGER) && (
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
            title="Create New Transfer"
          >
            <Plus size={18} className="mr-2" />
            New Transfer
          </button>
        )}
      </div>

      <div className="grid gap-4">
        {loading ? <p>Loading real-time transfers...</p> : relevantTransfers.map(t => (
          <div key={t.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-bold text-lg text-gray-800 dark:text-white">{t.reference}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold
                  ${t.status === TransferStatus.COMPLETED ? 'bg-green-100 text-green-700' : ''}
                  ${t.status === TransferStatus.PENDING ? 'bg-blue-100 text-blue-700' : ''}
                  ${t.status === TransferStatus.PENDING_APPROVAL ? 'bg-orange-100 text-orange-700' : ''}
                  ${t.status === TransferStatus.CANCELLED ? 'bg-red-100 text-red-700' : ''}
                `}>
                  {t.status === TransferStatus.PENDING ? 'IN TRANSIT' : t.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                <span>{getLocationName(t.fromLocationId)}</span>
                <ArrowRight size={14} className="text-gray-400" />
                <span>{getLocationName(t.toLocationId)}</span>
              </p>
              <div className="mt-2">
                  <span className="text-xs font-medium text-gray-500 uppercase">Chassis Numbers ({t.chassisNumbers.length}):</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                      {t.chassisNumbers.map(cn => (
                          <span key={cn} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs">{cn}</span>
                      ))}
                  </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">{new Date(t.dateInitiated).toLocaleString()}</p>
            </div>
            
            <div className="flex gap-2">
                {/* BRANCH MANAGER ACTIONS */}
                {user?.role === Role.BRANCH_MANAGER && (
                    <>
                        {/* Only Receive if it is In Transit to ME */}
                        {t.status === TransferStatus.PENDING && t.toLocationId === user.locationId && (
                            <button 
                                onClick={() => handleReceive(t.id)}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center shrink-0 shadow-sm"
                                title="Confirm Receipt"
                            >
                                <Check size={18} className="mr-2" />
                                Receive & Approve
                            </button>
                        )}
                    </>
                )}

                {/* ADMIN ACTIONS */}
                {user?.role === Role.ADMIN && (
                    <>
                        {t.status === TransferStatus.PENDING_APPROVAL && (
                            <button onClick={() => handleApprove(t.id)} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center">
                                <ShieldCheck size={18} className="mr-2" /> Approve
                            </button>
                        )}
                        
                        {/* Admin can see and Force Receive pending items */}
                        {t.status === TransferStatus.PENDING && (
                            <button onClick={() => handleReceive(t.id)} className="px-3 py-2 bg-blue-600 text-white rounded-lg flex items-center text-sm" title="Force Complete Transfer">
                                <Check size={16} className="mr-2" /> Approve & Finalize
                            </button>
                        )}

                        {(t.status === TransferStatus.PENDING || t.status === TransferStatus.PENDING_APPROVAL) && (
                            <button onClick={() => handleCancel(t.id)} className="px-3 py-2 bg-red-100 text-red-700 border border-red-200 rounded-lg flex items-center text-sm">
                                <XCircle size={16} className="mr-2" /> Cancel
                            </button>
                        )}
                    </>
                )}
            </div>
          </div>
        ))}
        {!loading && relevantTransfers.length === 0 && <p className="text-gray-500">No transfers found for your location.</p>}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 dark:text-white">Create Stock Transfer</h2>
            <form onSubmit={handleCreateTransfer} className="space-y-4">
              
              {user?.role === Role.ADMIN && (
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Origin (Warehouse or Branch)</label>
                    <select 
                      required 
                      value={selectedFromLocation} 
                      onChange={e => {
                          setSelectedFromLocation(e.target.value);
                          setSelectedBikes([]); 
                      }}
                      className="w-full p-2 border border-gray-600 rounded-lg bg-gray-700 text-white"
                    >
                      <option value="">Select Origin</option>
                      {locations.map(l => (
                        <option key={l.id} value={l.id}>{l.name} ({l.type})</option>
                      ))}
                    </select>
                  </div>
              )}

              {user?.role !== Role.ADMIN && (
                   <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-xs text-gray-500 uppercase block mb-1">Origin</span>
                      <span className="font-medium dark:text-white">
                          {locations.find(l => l.id === user?.locationId)?.name}
                      </span>
                   </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Destination Branch</label>
                <select 
                  required 
                  value={selectedToLocation} 
                  onChange={e => setSelectedToLocation(e.target.value)}
                  className="w-full p-2 border border-gray-600 rounded-lg bg-gray-700 text-white"
                >
                  <option value="">Select Branch</option>
                  {locations.filter(l => l.type === 'BRANCH' && l.id !== selectedFromLocation).map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Select Motorcycles</label>
                <div className="border border-gray-600 rounded-lg p-2 max-h-48 overflow-y-auto bg-gray-700/50">
                  {availableBikes.map(bike => (
                    <label key={bike.chassisNumber} className="flex items-center p-2 hover:bg-gray-600 cursor-pointer border-b border-gray-600/50 last:border-0">
                      <input 
                        type="checkbox"
                        checked={selectedBikes.includes(bike.chassisNumber)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedBikes([...selectedBikes, bike.chassisNumber]);
                          else setSelectedBikes(selectedBikes.filter(id => id !== bike.chassisNumber));
                        }}
                        className="mr-3 w-4 h-4 text-red-600 focus:ring-red-500 rounded border-gray-500"
                      />
                      <span className="text-sm text-gray-200">{bike.chassisNumber} - {bike.type} <span className='text-xs text-gray-400'>({bike.color})</span></span>
                    </label>
                  ))}
                  {availableBikes.length === 0 && (
                      <p className="text-sm text-gray-400 p-2 text-center">
                          {selectedFromLocation ? 'No available bikes in selected location.' : 'Select an origin first.'}
                      </p>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">{selectedBikes.length} selected</p>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700" disabled={selectedBikes.length === 0}>
                  {user?.role === Role.BRANCH_MANAGER ? 'Request Transfer' : 'Initiate & Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
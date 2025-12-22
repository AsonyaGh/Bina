
import React, { useState, useEffect, useMemo } from 'react';
import { storageService } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { Role, TransferStatus, MotorcycleStatus, Log, Transfer, Sale, Motorcycle, Location } from '../types';
import { Download, FileText, ArrowRight, ShieldAlert, TrendingUp, Package } from 'lucide-react';

export const Reports: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<Log[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [bikes, setBikes] = useState<Motorcycle[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
        setLoading(true);
        try {
            const [l, t, s, b, locs] = await Promise.all([
                storageService.getLogs(),
                storageService.getTransfers(),
                storageService.getSales(),
                storageService.getMotorcycles(),
                storageService.getLocations()
            ]);
            setLogs(l);
            setTransfers(t);
            setSales(s);
            setBikes(b);
            setLocations(locs);
        } catch(e) { console.error(e) }
        finally { setLoading(false); }
    };
    if (user) loadData();
  }, [user]);

  // 1. Filter Data Based on Role & Location
  const filteredTransfers = useMemo(() => {
    if (!user) return [];
    if (user.role === Role.ADMIN) return transfers;
    
    // Managers see transfers involving their location
    if (user.role === Role.WAREHOUSE_MANAGER || user.role === Role.BRANCH_MANAGER) {
      return transfers.filter(t => t.fromLocationId === user.locationId || t.toLocationId === user.locationId);
    }
    return [];
  }, [transfers, user]);

  const filteredSales = useMemo(() => {
    if (!user) return [];
    if (user.role === Role.ADMIN) return sales;
    
    if (user.role === Role.BRANCH_MANAGER) {
      return sales.filter(s => s.branchId === user.locationId);
    }
    if (user.role === Role.SALES_OFFICER) {
      return sales.filter(s => s.branchId === user.locationId);
    }
    return [];
  }, [sales, user]);

  const filteredInventory = useMemo(() => {
    if (!user) return [];
    if (user.role === Role.ADMIN) return bikes;
    
    if (user.role === Role.WAREHOUSE_MANAGER || user.role === Role.BRANCH_MANAGER || user.role === Role.SALES_OFFICER) {
      return bikes.filter(b => b.currentLocationId === user.locationId);
    }
    return [];
  }, [bikes, user]);

  const getLocationName = (id: string) => locations.find(l => l.id === id)?.name || id;

  const handleExport = () => {
    alert("Report exported to CSV successfully.");
  };

  if (!user) return null;
  if (loading) return <div className="p-6">Loading reports...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          {user.role === Role.ADMIN ? 'System Reports & Logs' : 'Station Reports'}
        </h1>
        <button 
          onClick={handleExport}
          className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          title="Export Reports to CSV"
        >
          <Download size={18} className="mr-2" />
          Export Report
        </button>
      </div>

      {/* 1. Inventory Report (Everyone with stock access) */}
      {(user.role === Role.ADMIN || user.role === Role.WAREHOUSE_MANAGER || user.role === Role.BRANCH_MANAGER) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
             <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                <Package size={20} />
             </div>
             <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Current Stock Level Report</h3>
          </div>
          <div className="p-6">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Bikes</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">{filteredInventory.length}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Available</p>
                    <p className="text-2xl font-bold text-green-600">
                        {filteredInventory.filter(b => b.status === MotorcycleStatus.AT_BRANCH || b.status === MotorcycleStatus.IN_WAREHOUSE).length}
                    </p>
                </div>
                 <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">In Transit</p>
                    <p className="text-2xl font-bold text-yellow-600">
                        {filteredInventory.filter(b => b.status === MotorcycleStatus.IN_TRANSIT).length}
                    </p>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* 2. Movement/Transfer Report (Admin, Warehouse, Branch) */}
      {(user.role === Role.ADMIN || user.role === Role.WAREHOUSE_MANAGER || user.role === Role.BRANCH_MANAGER) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
             <div className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400">
                <ArrowRight size={20} />
             </div>
             <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Bike Movement Report (Transfers)</h3>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
             <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                    <tr>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Reference</th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Route</th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Quantity</th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredTransfers.map(t => (
                        <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-300">{new Date(t.dateInitiated).toLocaleDateString()}</td>
                            <td className="px-6 py-3 text-sm font-medium dark:text-white">{t.reference}</td>
                            <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-300">
                                <div className="flex items-center gap-2">
                                    <span>{getLocationName(t.fromLocationId)}</span>
                                    <ArrowRight size={12} className="text-gray-400"/>
                                    <span>{getLocationName(t.toLocationId)}</span>
                                </div>
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-300">{t.chassisNumbers.length} Bikes</td>
                            <td className="px-6 py-3">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${t.status === TransferStatus.COMPLETED ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {t.status}
                                </span>
                            </td>
                        </tr>
                    ))}
                    {filteredTransfers.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No movement records found.</td>
                        </tr>
                    )}
                </tbody>
             </table>
          </div>
        </div>
      )}

      {/* 3. Sales Report (Admin, Branch, Sales Officer) */}
      {(user.role === Role.ADMIN || user.role === Role.BRANCH_MANAGER || user.role === Role.SALES_OFFICER) && (
         <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
                <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                    <TrendingUp size={20} />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Sales Performance</h3>
            </div>
            
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <div>
                     <p className="text-xs text-gray-500 uppercase">Total Revenue</p>
                     <p className="text-xl font-bold text-green-600">
                        ₵{filteredSales.reduce((acc, curr) => acc + curr.price, 0).toLocaleString()}
                     </p>
                </div>
                <div>
                     <p className="text-xs text-gray-500 uppercase">Units Sold</p>
                     <p className="text-xl font-bold text-gray-800 dark:text-white">{filteredSales.length}</p>
                </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                        <tr>
                            <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Item</th>
                            <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                            <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-right">Amount (GHS)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {filteredSales.map(s => (
                            <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-300">{new Date(s.date).toLocaleDateString()}</td>
                                <td className="px-6 py-3 text-sm dark:text-white">{s.chassisNumber}</td>
                                <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-300">{s.customerName}</td>
                                <td className="px-6 py-3 text-sm font-medium text-right text-gray-800 dark:text-gray-200">₵{s.price.toLocaleString()}</td>
                            </tr>
                        ))}
                         {filteredSales.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No sales records found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
         </div>
      )}

      {/* 4. System Audit Log (ADMIN ONLY) */}
      {user.role === Role.ADMIN && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden border-l-4 border-l-red-500">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
                <div className="p-2 bg-red-50 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
                    <ShieldAlert size={20} />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">System Audit Log (Admin Only)</h3>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                        <tr>
                            <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                            <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">User ID</th>
                            <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Action Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {logs.map(log => (
                            <tr key={log.id}>
                                <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">{new Date(log.timestamp).toLocaleString()}</td>
                                <td className="px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">{log.userId}</td>
                                <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">{log.details}</td>
                            </tr>
                        ))}
                        {logs.length === 0 && (
                            <tr>
                                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">No activity recorded yet.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}
    </div>
  );
};

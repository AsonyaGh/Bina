
import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { storageService } from '../services/storage';
import { MotorcycleStatus, Role, Motorcycle, Sale } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from 'recharts';
import { TrendingUp, AlertCircle, Package, MapPin } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [bikes, setBikes] = useState<Motorcycle[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
        try {
            const [fetchedBikes, fetchedSales] = await Promise.all([
                storageService.getMotorcycles(),
                storageService.getSales()
            ]);
            setBikes(fetchedBikes);
            setSales(fetchedSales);
        } catch (error) {
            console.error("Failed to load dashboard data", error);
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, []);

  const stats = useMemo(() => {
    if (!user) return { totalStock: 0, salesToday: 0, lowStock: 0 };

    let filteredBikes = bikes;
    if (user.role === Role.BRANCH_MANAGER || user.role === Role.SALES_OFFICER) {
      filteredBikes = bikes.filter(b => b.currentLocationId === user.locationId);
    } else if (user.role === Role.WAREHOUSE_MANAGER) {
      filteredBikes = bikes.filter(b => b.currentLocationId === user.locationId);
    }

    const totalStock = filteredBikes.filter(b => b.status !== MotorcycleStatus.SOLD).length;
    
    // Simulate some sales logic
    const salesCount = sales.length; // Simplified for demo
    
    return {
      totalStock,
      salesTotal: salesCount,
      lowStock: totalStock < 5,
    };
  }, [bikes, sales, user]);

  const stockData = useMemo(() => {
    const statusCounts = {
        [MotorcycleStatus.IN_WAREHOUSE]: 0,
        [MotorcycleStatus.AT_BRANCH]: 0,
        [MotorcycleStatus.IN_TRANSIT]: 0,
        [MotorcycleStatus.SOLD]: 0,
    };
    bikes.forEach(b => {
        if (statusCounts[b.status] !== undefined) {
            statusCounts[b.status]++;
        }
    });
    return Object.keys(statusCounts).map(key => ({ name: key.replace('_', ' '), value: statusCounts[key as MotorcycleStatus] }));
  }, [bikes]);

  const salesTrendData = useMemo(() => {
      // Mock trend data based on sales (grouped by date)
      return [
          { name: 'Jan', sales: 4 },
          { name: 'Feb', sales: 7 },
          { name: 'Mar', sales: 5 },
          { name: 'Apr', sales: 12 },
          { name: 'May', sales: 9 },
          { name: 'Jun', sales: 15 },
      ];
  }, []);

  const COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981'];

  if (loading) return <div className="p-6 text-center text-gray-500">Loading dashboard data...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Stock</p>
              <h3 className="text-3xl font-bold text-gray-800 dark:text-white mt-1">{stats.totalStock}</h3>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900 rounded-full text-blue-600 dark:text-blue-300">
              <Package size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Sales</p>
              <h3 className="text-3xl font-bold text-gray-800 dark:text-white mt-1">{stats.salesTotal}</h3>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900 rounded-full text-green-600 dark:text-green-300">
              <TrendingUp size={24} />
            </div>
          </div>
        </div>

         <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Stock Status</p>
              <h3 className={`text-xl font-bold mt-1 ${stats.lowStock ? 'text-red-500' : 'text-green-500'}`}>
                {stats.lowStock ? 'Low Stock Alert' : 'Healthy Level'}
              </h3>
            </div>
            <div className={`p-3 rounded-full ${stats.lowStock ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
              <AlertCircle size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Distribution */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-96">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Inventory Status</h3>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={stockData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {stockData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2 flex-wrap">
                {stockData.map((entry, index) => (
                    <div key={index} className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                        <span className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                        {entry.name}: {entry.value}
                    </div>
                ))}
            </div>
        </div>

        {/* Sales Trend */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-96">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Sales Trend (6 Months)</h3>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="sales" stroke="#ef4444" strokeWidth={3} activeDot={{ r: 8 }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

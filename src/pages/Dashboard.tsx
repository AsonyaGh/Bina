import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { storageService } from '../services/storage';
import { MotorcycleStatus, Role, Motorcycle, Sale } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from 'recharts';
import { TrendingUp, AlertCircle, Package } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [bikes, setBikes] = useState<Motorcycle[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Real-time subscriptions
    const unsubBikes = storageService.subscribeToMotorcycles(setBikes);
    const unsubSales = storageService.subscribeToSales(setSales);
    setLoading(false);

    return () => {
        unsubBikes();
        unsubSales();
    };
  }, []);

  const stats = useMemo(() => {
    if (!user) return { totalStock: 0, salesTotal: 0, salesRevenue: 0, lowStock: 0 };

    let visibleBikes = bikes;
    if (user.role === Role.BRANCH_MANAGER || user.role === Role.SALES_OFFICER) {
      visibleBikes = bikes.filter(b => b.currentLocationId === user.locationId);
    } else if (user.role === Role.WAREHOUSE_MANAGER) {
      visibleBikes = bikes.filter(b => b.currentLocationId === user.locationId);
    }

    const totalStock = visibleBikes.filter(b => b.status !== MotorcycleStatus.SOLD).length;
    const lowStock = totalStock < 5;

    let visibleSales = sales;
    if (user.role === Role.BRANCH_MANAGER || user.role === Role.SALES_OFFICER) {
        visibleSales = sales.filter(s => s.branchId === user.locationId);
    }

    const salesTotal = visibleSales.length;
    const salesRevenue = visibleSales.reduce((sum, s) => sum + s.price, 0);
    
    return {
      totalStock,
      salesTotal,
      salesRevenue,
      lowStock,
    };
  }, [bikes, sales, user]);

  const stockData = useMemo(() => {
    let visibleBikes = bikes;
    if (user?.role !== Role.ADMIN) {
        visibleBikes = bikes.filter(b => b.currentLocationId === user?.locationId);
    }

    const statusCounts = {
        [MotorcycleStatus.IN_WAREHOUSE]: 0,
        [MotorcycleStatus.AT_BRANCH]: 0,
        [MotorcycleStatus.IN_TRANSIT]: 0,
        [MotorcycleStatus.SOLD]: 0,
    };
    visibleBikes.forEach(b => {
        if (statusCounts[b.status] !== undefined) statusCounts[b.status]++;
    });
    return Object.keys(statusCounts).map(key => ({ name: key.replace('_', ' '), value: statusCounts[key as MotorcycleStatus] }));
  }, [bikes, user]);

  const salesTrendData = useMemo(() => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentYear = new Date().getFullYear();
      
      const trend = months.map((m, i) => {
          const count = sales.filter(s => {
              const d = new Date(s.date);
              return d.getMonth() === i && d.getFullYear() === currentYear;
          }).length;
          return { name: m, sales: count };
      });
      const currentMonth = new Date().getMonth();
      return trend.slice(Math.max(0, currentMonth - 5), currentMonth + 1);
  }, [sales]);

  const COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
        {loading && <span className="text-sm text-gray-500 animate-pulse">Syncing live data...</span>}
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Sales Count</p>
              <h3 className="text-3xl font-bold text-gray-800 dark:text-white mt-1">{stats.salesTotal}</h3>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900 rounded-full text-purple-600 dark:text-purple-300">
              <TrendingUp size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
              <h3 className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">₵{stats.salesRevenue.toLocaleString()}</h3>
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
                {stats.lowStock ? 'Low Stock' : 'Healthy'}
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

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-96">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Sales Trend ({new Date().getFullYear()})</h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px' }} />
                    <Bar dataKey="sales" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
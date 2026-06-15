import { useEffect, useState } from 'react';
import { Users, DollarSign, Activity, Target, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 3000); // Live update
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      const res = await api.get('/dashboard');
      setMetrics(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Are you sure you want to completely wipe the database and reset all campaigns?")) return;
    setIsResetting(true);
    try {
      await api.post('/reset');
      await fetchMetrics();
    } catch (e) {
      console.error("Reset failed", e);
    } finally {
      setIsResetting(false);
    }
  };

  if (!metrics) return <div className="text-slate-400 animate-pulse">Loading dashboard...</div>;

  const funnelData = [
    { name: 'Pending', count: metrics.funnel.PENDING || 0 },
    { name: 'Failed', count: metrics.funnel.FAILED || 0 },
    { name: 'Sent', count: metrics.funnel.SENT || 0 },
    { name: 'Delivered', count: metrics.funnel.DELIVERED || 0 },
    { name: 'Opened', count: metrics.funnel.OPENED || 0 },
    { name: 'Clicked', count: metrics.funnel.CLICKED || 0 },
    { name: 'Converted', count: metrics.funnel.CONVERTED || 0 },
  ];

  const formatCompactNumber = (num: number) => {
    return Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(num);
  };

  return (
    <div className="space-y-6">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-black dark:text-white tracking-tight">Overview</h2>
          <p className="text-gray-600 dark:text-slate-400 mt-1">Live metrics and campaign performance.</p>
        </div>
        <button
          onClick={handleReset}
          disabled={isResetting}
          className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 font-medium rounded-xl transition-colors disabled:opacity-50"
        >
          <RefreshCw size={18} className={isResetting ? "animate-spin" : ""} />
          {isResetting ? 'Resetting Database...' : 'Reset CRM'}
        </button>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Shoppers', val: metrics.totalCustomers.toLocaleString(), icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
          { label: 'Total Revenue', val: `₹${formatCompactNumber(metrics.totalRevenue)}`, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
          { label: 'Campaign Attributed', val: `₹${formatCompactNumber(metrics.campaignRevenue)}`, icon: Target, color: 'text-purple-400', bg: 'bg-purple-400/10' },
          { label: 'Active Campaigns', val: metrics.activeCampaigns || 0, icon: Activity, color: 'text-amber-400', bg: 'bg-amber-400/10' },
          { label: 'Total Campaigns', val: metrics.totalCampaigns || 0, icon: Target, color: 'text-pink-400', bg: 'bg-pink-400/10' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-6 rounded-2xl flex items-center gap-4 shadow-sm">
            <div className={`p-4 rounded-xl ${kpi.bg} shrink-0`}>
              <kpi.icon size={24} className={kpi.color} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{kpi.label}</p>
              <h3 className="text-2xl font-bold text-black dark:text-white">{kpi.val}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Funnel Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-6 rounded-2xl h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Delivery Funnel</h3>
            <span className="text-sm text-gray-500 font-medium">
              Total Users Targeted: {funnelData.reduce((acc, stage) => acc + stage.count, 0).toLocaleString()}
            </span>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnelData} margin={{ top: 0, right: 0, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip 
                cursor={{ fill: '#334155', opacity: 0.4 }}
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
              />
              <Bar dataKey="count" fill="#818cf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Live Event Log */}
        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-gray-200 dark:border-slate-800/50 p-6 rounded-2xl h-[400px] flex flex-col shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Live Feed</h3>
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {metrics.recentLogs.map((log: any, i: number) => (
              <div key={i} className="flex flex-col p-3 rounded-lg bg-slate-800/30 border border-slate-700/30 text-sm animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-slate-200">{log.customer_name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                    ${log.status === 'CONVERTED' ? 'bg-emerald-500/20 text-emerald-400' :
                      log.status === 'CLICKED' ? 'bg-purple-500/20 text-purple-400' :
                      log.status === 'FAILED' ? 'bg-red-500/20 text-red-400' :
                      'bg-blue-500/20 text-blue-400'
                    }
                  `}>
                    {log.status}
                  </span>
                </div>
                <span className="text-slate-500 text-xs">via {log.channel.toUpperCase()}</span>
              </div>
            ))}
            {metrics.recentLogs.length === 0 && (
              <div className="text-slate-500 text-sm text-center mt-10">Waiting for campaign events...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

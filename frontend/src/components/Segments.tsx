import { useState } from 'react';
import { api } from '../lib/api';
import { Sparkles, Search, CheckCircle } from 'lucide-react';

export default function Segments() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const res = await api.post('/segments/preview', { prompt });
      setResult(res.data);
    } catch (e) {
      console.error(e);
      alert('Failed to generate segment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-black dark:text-white tracking-tight">AI Audience Segmentation</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Describe who you want to reach, and our AI will build the audience.</p>
      </header>

      {/* Input Area */}
      <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-indigo-200 dark:border-indigo-500/30 p-1 rounded-2xl flex shadow-[0_0_20px_rgba(99,102,241,0.1)] focus-within:shadow-[0_0_30px_rgba(99,102,241,0.2)] transition-shadow">
        <div className="p-4 pl-5 text-indigo-400 flex items-center">
          <Sparkles size={24} />
        </div>
        <input 
          type="text" 
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          placeholder="e.g. Find customers in India who bought Winter Coats..."
          className="flex-1 bg-transparent border-none outline-none text-black dark:text-white text-lg placeholder-gray-500"
        />
        <button 
          onClick={handleGenerate}
          disabled={loading}
          className="m-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
        >
          {loading ? 'Thinking...' : 'Generate Audience'}
        </button>
      </div>

      {/* Results Area */}
      {result && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-8">
          
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-gray-200 dark:border-slate-800/50 p-6 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3 text-emerald-500 dark:text-emerald-400 mb-4">
                <CheckCircle size={24} />
                <h3 className="text-xl font-bold text-black dark:text-white">Audience Found</h3>
              </div>
              <p className="text-5xl font-black text-black dark:text-white mb-2">{result.count.toLocaleString()}</p>
              <p className="text-gray-600 dark:text-gray-400 font-medium">Matching Shoppers</p>
            </div>

            <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-gray-200 dark:border-slate-800/50 p-6 rounded-2xl shadow-sm">
              <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">Generated SQL Rule</h4>
              <code className="text-sm text-indigo-600 dark:text-indigo-300 block bg-gray-50 dark:bg-slate-950 p-4 rounded-xl border border-gray-200 dark:border-slate-800 overflow-x-auto">
                WHERE {result.sqlFilter}
              </code>
            </div>
          </div>

          <div className="md:col-span-2 bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-gray-200 dark:border-slate-800/50 p-6 rounded-2xl shadow-sm">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-black dark:text-white">
              <Search size={20} className="text-gray-500 dark:text-gray-400" />
              Matched Shoppers
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-800 text-gray-500 dark:text-gray-400">
                    <th className="pb-3 font-medium px-4">Name</th>
                    <th className="pb-3 font-medium px-4 text-center">Age</th>
                    <th className="pb-3 font-medium px-4 text-center">Gender</th>
                    <th className="pb-3 font-medium px-4">Email</th>
                    <th className="pb-3 font-medium px-4">Phone</th>
                    <th className="pb-3 font-medium px-4">Location</th>
                    <th className="pb-3 font-medium px-4 text-center">Total Spent</th>
                    <th className="pb-3 font-medium px-4 text-center">Purchases</th>
                    <th className="pb-3 font-medium px-4 text-right">Persona</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800/50">
                  {result.sample.map((s: any) => (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors group">
                      <td className="py-4 px-4 font-medium text-black dark:text-white">
                        {s.name}
                      </td>
                      <td className="py-4 px-4 text-center text-gray-600 dark:text-gray-300">
                        {s.age || '-'}
                      </td>
                      <td className="py-4 px-4 text-center text-gray-600 dark:text-gray-300">
                        {s.gender || 'Unknown'}
                      </td>
                      <td className="py-4 px-4 text-gray-600 dark:text-gray-300">
                        {s.email}
                      </td>
                      <td className="py-4 px-4 text-gray-600 dark:text-gray-300">
                        {s.phone}
                      </td>
                      <td className="py-4 px-4 text-gray-600 dark:text-gray-300">
                        {s.city}, {s.country}
                      </td>
                      <td className="py-4 px-4 text-center text-gray-600 dark:text-gray-300 font-medium">
                        {s.total_spent ? `$${parseFloat(s.total_spent).toLocaleString()}` : '-'}
                      </td>
                      <td className="py-4 px-4 text-center max-w-[200px] truncate">
                        <div className="flex flex-wrap justify-center gap-1">
                          {s.order_details ? s.order_details.flatMap((o: any, oIndex: number) => {
                            if (o.items && Array.isArray(o.items)) {
                              return o.items.map((item: any, iIndex: number) => (
                                <span key={`${oIndex}-${iIndex}`} className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs rounded-md border border-indigo-100 dark:border-indigo-800/50" title={item.price ? item.price : `$${o.amount}`}>
                                  {item.name}
                                </span>
                              ));
                            }
                            return (
                              <span key={oIndex} className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs rounded-md border border-indigo-100 dark:border-indigo-800/50" title={`$${o.amount}`}>
                                {o.category}
                              </span>
                            );
                          }) : <span className="text-gray-400 text-xs">-</span>}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="px-3 py-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-lg text-xs font-medium uppercase tracking-wider border border-gray-200 dark:border-slate-700">
                          {s.persona}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {result.sample.length === 0 && (
                <p className="text-slate-400">No shoppers match this criteria.</p>
            )}

            <div className="mt-6 pt-6 border-t border-slate-800 flex justify-end">
              <p className="text-sm text-slate-500">
                To launch a campaign to this audience, head over to the Campaigns tab.
              </p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

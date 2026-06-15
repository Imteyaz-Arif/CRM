import { useState } from 'react';
import { api } from '../lib/api';
import { Send, Sparkles, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Campaigns() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [campaign, setCampaign] = useState({
    name: '',
    segmentPrompt: '',
    channel: 'whatsapp',
    templateText: ''
  });

  const [preview, setPreview] = useState<any>(null);

  const handlePreviewSegment = async () => {
    if (!campaign.segmentPrompt) return;
    setLoading(true);
    try {
      const res = await api.post('/segments/preview', { prompt: campaign.segmentPrompt });
      setPreview(res.data);
      setStep(2);
    } catch (e) {
      alert('Failed to preview segment');
    } finally {
      setLoading(false);
    }
  };

  const handleDraftMessage = async () => {
    setLoading(true);
    try {
      const sampleCustomer = preview?.sample[0] || null;
      const res = await api.post('/campaigns/draft', { 
        prompt: `Campaign: ${campaign.name}, Audience: ${campaign.segmentPrompt}`,
        sampleCustomer 
      });
      setCampaign(c => ({ ...c, templateText: res.data.draft }));
    } catch (e) {
      alert('Failed to draft message');
    } finally {
      setLoading(false);
    }
  };

  const handleLaunch = async () => {
    if (!campaign.name || !campaign.templateText || !preview) return;
    setLoading(true);
    try {
      await api.post('/campaigns', {
        name: campaign.name,
        segmentPrompt: campaign.segmentPrompt,
        sqlFilter: preview.sqlFilter,
        channel: campaign.channel,
        templateText: campaign.templateText
      });
      // Redirect to dashboard to watch live feed!
      navigate('/');
    } catch (e) {
      alert('Failed to launch campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <header className="mb-8 border-b border-gray-200 dark:border-slate-800 pb-6">
        <h2 className="text-3xl font-bold text-black dark:text-white tracking-tight">Campaign Orchestrator</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Design and dispatch personalized communications.</p>
      </header>

      {/* STEP 1: Audience & Channel */}
      <div className={`p-8 rounded-3xl border transition-all duration-300 shadow-sm ${step === 1 ? 'bg-white dark:bg-slate-900/80 border-indigo-200 dark:border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.1)]' : 'bg-gray-50 dark:bg-slate-900/30 border-gray-200 dark:border-slate-800/50 opacity-60'}`}>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">1</div>
          <h3 className="text-xl font-bold text-black dark:text-white">Audience & Channel</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Campaign Name</label>
            <input 
              type="text" 
              value={campaign.name}
              onChange={e => setCampaign({...campaign, name: e.target.value})}
              placeholder="e.g. Winter Clearance 2026"
              className="w-full bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl p-3 text-black dark:text-white outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Delivery Channel</label>
            <select 
              value={campaign.channel}
              onChange={e => setCampaign({...campaign, channel: e.target.value})}
              className="w-full bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl p-3 text-black dark:text-white outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="rcs">RCS</option>
            </select>
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Target Audience (AI Prompt)</label>
            <textarea 
              value={campaign.segmentPrompt}
              onChange={e => setCampaign({...campaign, segmentPrompt: e.target.value})}
              placeholder="e.g. Female shoppers in London who bought dresses in the last 6 months..."
              className="w-full bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl p-3 text-black dark:text-white outline-none focus:border-indigo-500 transition-colors h-24 resize-none"
            />
          </div>
        </div>

        {step === 1 && (
          <div className="mt-6 flex justify-end">
            <button 
              onClick={handlePreviewSegment}
              disabled={loading || !campaign.name || !campaign.segmentPrompt}
              className="px-6 py-3 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
            >
              {loading ? 'Evaluating...' : 'Next: Compose Message'}
            </button>
          </div>
        )}
      </div>

      {/* STEP 2: Message Copy */}
      {step >= 2 && (
        <div className={`p-8 rounded-3xl border transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 shadow-sm ${step === 2 ? 'bg-white dark:bg-slate-900/80 border-purple-200 dark:border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.1)]' : 'bg-gray-50 dark:bg-slate-900/30 border-gray-200 dark:border-slate-800/50 opacity-60'}`}>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">2</div>
            <h3 className="text-xl font-bold flex-1 text-black dark:text-white">Message Copy</h3>
            <span className="text-sm bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 px-3 py-1 rounded-full flex items-center gap-2 border border-gray-200 dark:border-slate-700">
              <Users size={14} /> Targeting {preview?.count} shoppers
            </span>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Message Template</label>
              <button 
                onClick={handleDraftMessage}
                disabled={loading}
                className="text-xs bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Sparkles size={14} /> Auto-draft with AI
              </button>
            </div>
            
            <textarea 
              value={campaign.templateText}
              onChange={e => setCampaign({...campaign, templateText: e.target.value})}
              placeholder="Type your message here or use AI to draft it..."
              className="w-full bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl p-4 text-black dark:text-white outline-none focus:border-purple-500 transition-colors h-32 resize-none"
            />
            
            {campaign.templateText && (
              <div className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold">Preview for Sample User</p>
                <div className="bg-white dark:bg-slate-800/50 p-3 rounded-lg border border-gray-200 dark:border-slate-700/50">
                  <p className="text-black dark:text-white">{campaign.templateText}</p>
                </div>
              </div>
            )}
          </div>

          {step === 2 && (
            <div className="mt-8 flex justify-between items-center border-t border-slate-800/50 pt-6">
              <button onClick={() => setStep(1)} className="text-slate-400 hover:text-slate-200 font-medium">Back</button>
              <button 
                onClick={handleLaunch}
                disabled={loading || !campaign.templateText}
                className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-medium rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] flex items-center gap-2"
              >
                <Send size={18} />
                {loading ? 'Launching...' : 'Launch Campaign'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

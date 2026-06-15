import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Send } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Segments from './components/Segments';
import Campaigns from './components/Campaigns';
import ThemeToggle from './components/ThemeToggle';
import Chat from './components/Chat';

function Sidebar() {
  const location = useLocation();
  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/segments', label: 'Segments', icon: Users },
    { path: '/campaigns', label: 'Campaigns', icon: Send },
  ];

  return (
    <div className="w-64 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-r border-gray-200 dark:border-gray-800 h-screen flex flex-col p-4 fixed left-0 top-0 transition-colors duration-300">
      <div className="flex items-center justify-between px-2 mb-10 mt-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-black dark:bg-white flex items-center justify-center">
            <span className="font-bold text-white dark:text-black tracking-wider">A</span>
          </div>
          <h1 className="text-xl font-bold text-black dark:text-white tracking-wide">
            Aura Threads
          </h1>
        </div>
      </div>
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                active 
                  ? 'bg-gray-100 dark:bg-gray-800 text-black dark:text-white border border-gray-200 dark:border-gray-700 font-semibold' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-900'
              }`}
            >
              <Icon size={20} className={active ? 'text-black dark:text-white' : 'text-gray-400 dark:text-gray-500'} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-2 pb-4">
        <ThemeToggle />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-white dark:bg-black text-black dark:text-white selection:bg-gray-200 dark:selection:bg-gray-800 font-sans transition-colors duration-300">
        {/* Background ambient glow removed for strict monochrome aesthetic */}

        <Sidebar />
        
        <main className="flex-1 ml-64 p-8 relative z-10 h-screen overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/segments" element={<Segments />} />
            <Route path="/campaigns" element={<Campaigns />} />
          </Routes>
        </main>

        <Chat />
      </div>
    </Router>
  );
}

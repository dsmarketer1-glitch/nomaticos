import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { 
  SignedIn, 
  SignedOut, 
  SignIn, 
  useUser, 
  UserButton 
} from '@clerk/clerk-react';
import { useTheme } from './hooks/useTheme';
import { getClients, getTasks } from './lib/api';
import Sidebar from './components/Sidebar';
import EODModal from './components/EODModal';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Tasks from './pages/Tasks';
import Payments from './pages/Payments';
import HoursTracking from './pages/HoursTracking';
import CRM from './pages/CRM';
import Settings from './pages/Settings';

const ALLOWED_EMAIL = 'ds.marketer1@gmail.com';

function AuthenticatedApp() {
  const { isDark, toggleTheme } = useTheme();
  const { user } = useUser();
  const [clientCount, setClientCount] = useState(0);
  const [openTaskCount, setOpenTaskCount] = useState(0);
  const [showEOD, setShowEOD] = useState(false);

  const userEmail = user?.primaryEmailAddress?.emailAddress;
  const isAuthorized = userEmail === ALLOWED_EMAIL;

  useEffect(() => {
    if (!isAuthorized) return;

    const fetchStats = async () => {
      try {
        const [clients, tasks] = await Promise.all([getClients(), getTasks()]);
        setClientCount(clients.length || 0);
        setOpenTaskCount(tasks?.filter(t => t.status !== 'Done').length || 0);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [isAuthorized]);

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#080c14] text-white p-6 text-center">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Access Denied</h1>
        <p className="text-muted mb-6">This app is restricted to authorized users only. (Logged in as: {userEmail})</p>
        <UserButton afterSignOutUrl="/" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen transition-theme" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Sidebar
        isDark={isDark}
        toggleTheme={toggleTheme}
        clientCount={clientCount}
        taskCount={openTaskCount}
      />

      <main className="flex-1 ml-[220px]" style={{ padding: '28px 32px' }}>
        <div className="flex justify-end p-2 absolute top-4 right-8 z-50">
           <UserButton />
        </div>
        <Routes>
          <Route path="/" element={<Dashboard isDark={isDark} />} />
          <Route path="/clients" element={<Clients isDark={isDark} />} />
          <Route path="/tasks" element={<Tasks isDark={isDark} />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/hours-tracking" element={<HoursTracking isDark={isDark} />} />
          <Route path="/crm" element={<CRM isDark={isDark} />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <button
        onClick={() => setShowEOD(true)}
        className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-full text-sm font-semibold eod-btn btn-press"
        style={{
          background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
          color: '#fff',
          boxShadow: '0 4px 20px rgba(245, 158, 11, 0.35)',
        }}
        id="eod-btn"
      >
        Finish the Day
      </button>

      <EODModal isOpen={showEOD} onClose={() => setShowEOD(false)} isDark={isDark} />
    </div>
  );
}

export default function App() {
  return (
    <>
      <SignedIn>
        <AuthenticatedApp />
      </SignedIn>
      <SignedOut>
        <div className="flex items-center justify-center min-h-screen bg-[#080c14]">
          <SignIn routing="path" path="/" />
        </div>
      </SignedOut>
    </>
  );
}

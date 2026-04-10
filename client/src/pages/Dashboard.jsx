import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getClients, getTasks, updateTask, getLeads, getPayments, 
  getGoal, updateGoal 
} from '../lib/api';
import { requestNotificationPermission, subscribeUserToPush } from '../lib/notifications';
import { getFirstDayOfMonth, getLocalToday } from '../lib/date';
import Modal from '../components/Modal';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid 
} from 'recharts';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'];

export default function Dashboard() {
  const navigate = useNavigate();
  
  // Data State
  const [clients, setClients] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [leads, setLeads] = useState([]);
  const [payments, setPayments] = useState([]);
  const [goal, setGoal] = useState({ revenue_target: 500000, leads_target: 10, tasks_target: 50 });
  const [loading, setLoading] = useState(true);

  // Filter State
  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(getLocalToday());
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalForm, setGoalForm] = useState({ revenue_target: 0, leads_target: 0, tasks_target: 0 });

  const userName = localStorage.getItem('nomatic_user_name') || 'Deepak';
  const currency = localStorage.getItem('nomatic_currency') || '₹';

  const fetchData = async () => {
    try {
      const monthYear = startDate.substring(0, 7); // YYYY-MM
      const [c, tasks, l, p, g] = await Promise.all([
        getClients(),
        getTasks(),
        getLeads(),
        getPayments(),
        getGoal(monthYear)
      ]);
      setClients(c);
      setAllTasks(tasks);
      setLeads(l);
      setPayments(p);
      setGoal(g);
      setGoalForm({ 
        revenue_target: g.revenue_target, 
        leads_target: g.leads_target, 
        tasks_target: g.tasks_target 
      });
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [startDate]);

  // --- Filtering Logic ---
  
  const isWithinRange = (dateStr) => {
    if (!dateStr) return false;
    return dateStr >= startDate && dateStr <= endDate;
  };

  const filteredTasks = useMemo(() => allTasks.filter(t => isWithinRange(t.due_date)), [allTasks, startDate, endDate]);
  const filteredPayments = useMemo(() => payments.filter(p => isWithinRange(p.received_date || p.due_date)), [payments, startDate, endDate]);
  const filteredLeads = useMemo(() => leads.filter(l => isWithinRange(l.closed_at || l.created_at)), [leads, startDate, endDate]);

  const activePipelineLeads = useMemo(() => leads.filter(l => l.status !== 'Closed' && l.status !== 'Lost'), [leads]);
  const totalPipelineValue = useMemo(() => activePipelineLeads.reduce((s, l) => s + (l.pitched_amount || 0), 0), [activePipelineLeads]);

  const closedLeadsInRange = useMemo(() => filteredLeads.filter(l => l.status === 'Closed'), [filteredLeads]);
  const revenueInRange = useMemo(() => closedLeadsInRange.reduce((s, l) => s + (l.closed_amount || 0), 0), [closedLeadsInRange]);
  
  const completedTasksInRange = filteredTasks.filter(t => t.status === 'Done').length;
  const pendingTasksInRange = filteredTasks.filter(t => t.status !== 'Done').length;

  const revenueProgress = Math.min(Math.round((revenueInRange / (goal.revenue_target || 1)) * 100), 100);
  const leadsProgress = Math.min(Math.round((closedLeadsInRange.length / (goal.leads_target || 1)) * 100), 100);

  // --- Chart Data ---

  const pipelineData = [
    { name: 'Cold', value: activePipelineLeads.filter(l => l.status === 'Cold').reduce((s, l) => s + (l.pitched_amount || 0), 0) },
    { name: 'Warm', value: activePipelineLeads.filter(l => l.status === 'Warm').reduce((s, l) => s + (l.pitched_amount || 0), 0) },
    { name: 'Hot', value: activePipelineLeads.filter(l => l.status === 'Hot').reduce((s, l) => s + (l.pitched_amount || 0), 0) },
  ];

  const chartData = useMemo(() => {
    // Basic velocity chart based on closed amount in range
    return [
      { name: 'Start', revenue: 0 },
      { name: 'Mid', revenue: revenueInRange * 0.6 },
      { name: 'Current', revenue: revenueInRange },
    ];
  }, [revenueInRange]);

  const handleGoalSave = async () => {
    try {
      await updateGoal({ ...goalForm, month_year: startDate.substring(0, 7) });
      setShowGoalModal(false);
      fetchData();
    } catch (err) {
      alert('Failed to update goal');
    }
  };

  const toggleTaskStatus = async (task) => {
    const newStatus = task.status === 'Done' ? 'To Do' : 'Done';
    await updateTask(task.id, { status: newStatus });
    fetchData();
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      const success = await subscribeUserToPush();
      if (success) alert('Notifications enabled successfully!');
      else alert('Failed to subscribe. Check your browser settings.');
    } else {
      alert('Notification permission denied.');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-lg text-muted">Loading...</div></div>;

  return (
    <div className="animate-fadeIn pb-10">
      {/* Header & Date Selector */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-head text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {getGreeting()}, {userName}
          </h1>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 border border-white/10">
              <span className="text-[10px] font-bold uppercase text-muted">Range:</span>
              <input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-accent focus:ring-0 outline-none p-0 cursor-pointer"
              />
              <span className="text-muted text-xs">to</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-accent focus:ring-0 outline-none p-0 cursor-pointer"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleEnableNotifications} className="px-5 py-2.5 rounded-input text-xs font-bold uppercase tracking-widest bg-blue/10 border border-blue/20 hover:bg-blue/20 text-blue transition-all">
            🔔 Enable Notifications
          </button>
          <button onClick={() => setShowGoalModal(true)} className="px-5 py-2.5 rounded-input text-xs font-bold uppercase tracking-widest bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
            Set Monthly Goal
          </button>
          <button onClick={() => navigate('/crm')} className="px-5 py-2.5 rounded-input text-xs font-bold uppercase tracking-widest bg-accent text-black transition-all">
            Leads Detail
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        <div className="p-6 rounded-2xl border border-white/5 glass-card" style={{ backgroundColor: 'var(--bg-card)' }}>
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Revenue in Range</div>
          <div className="text-2xl font-head font-bold text-accent">{currency}{revenueInRange.toLocaleString('en-IN')}</div>
          <div className="mt-3 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-accent transition-all duration-1000" style={{ width: `${revenueProgress}%` }} />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-muted">{revenueProgress}% of Goal</span>
            <span className="text-[10px] font-bold text-accent">{currency}{goal.revenue_target.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-white/5 glass-card" style={{ backgroundColor: 'var(--bg-card)' }}>
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Total Pipeline</div>
          <div className="text-2xl font-head font-bold text-blue">{currency}{totalPipelineValue.toLocaleString('en-IN')}</div>
          <div className="text-[10px] mt-2 text-muted">Active leads only</div>
        </div>

        <div className="p-6 rounded-2xl border border-white/5 glass-card" style={{ backgroundColor: 'var(--bg-card)' }}>
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Goal: Closed Leads</div>
          <div className="text-2xl font-head font-bold text-green">{closedLeadsInRange.length} / {goal.leads_target}</div>
          <div className="mt-3 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-green transition-all duration-1000" style={{ width: `${leadsProgress}%` }} />
          </div>
          <div className="text-[10px] mt-2 text-muted">Target: {goal.leads_target} conversions</div>
        </div>

        <div className="p-6 rounded-2xl border border-white/5 glass-card" style={{ backgroundColor: 'var(--bg-card)' }}>
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Range Health</div>
          <div className="text-2xl font-head font-bold text-red">{completedTasksInRange} / {filteredTasks.length}</div>
          <div className="text-[10px] mt-2 text-muted">Tasks finished in range</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* Revenue Velocity Chart */}
        <div className="col-span-2 rounded-2xl border p-6 border-white/5 bg-card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-head text-sm font-bold uppercase tracking-widest text-muted">Revenue Velocity (Range)</h2>
            <div className="text-xs px-2 py-1 bg-green/10 text-green rounded border border-green/20">Target: {currency}{goal.revenue_target.toLocaleString('en-IN')}</div>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1b1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pipeline Distribution */}
        <div className="col-span-1 rounded-2xl border p-6 border-white/5 bg-card">
          <h2 className="font-head text-sm font-bold uppercase tracking-widest text-muted mb-6">Pipeline Value Distribution</h2>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.4)" fontSize={10} width={60} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#1a1b1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                  {pipelineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Goal Activities */}
        <div className="p-6 rounded-2xl border border-white/5 bg-card overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-head text-sm font-bold uppercase tracking-widest text-muted">Goal Activities</h2>
            <div className="text-[10px] text-green font-bold">Wins: {closedLeadsInRange.length}</div>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {closedLeadsInRange.length === 0 && <div className="text-center py-10 text-xs text-muted">No closed deals in this range.</div>}
            {closedLeadsInRange.map(l => (
              <div key={l.id} className="p-3 rounded-xl bg-green/5 border border-green/10 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white">{l.client_name}</div>
                  <div className="text-[10px] text-muted">Won on {l.closed_at?.split(' ')[0] || l.created_at?.split(' ')[0]}</div>
                </div>
                <div className="text-sm font-bold text-green">+{currency}{l.closed_amount.toLocaleString('en-IN')}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Task Health */}
        <div className="p-6 rounded-2xl border border-white/5 bg-card overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-head text-sm font-bold uppercase tracking-widest text-muted">Task Performance</h2>
            <div className="text-[10px] text-accent font-bold">Remaining: {pendingTasksInRange}</div>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredTasks.length === 0 && <div className="text-center py-10 text-xs text-muted">No tasks in this range.</div>}
            {filteredTasks.map(task => (
              <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
                <button onClick={() => toggleTaskStatus(task)} className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${task.status === 'Done' ? 'bg-green border-green' : 'border-white/10'}`}>
                  {task.status === 'Done' && <span className="text-white text-[10px] font-bold">✓</span>}
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium truncate ${task.status === 'Done' ? 'line-through opacity-40' : ''}`}>{task.title}</div>
                  <div className="text-[10px] text-accent font-bold mt-0.5">{task.client_name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Goal Setting Modal */}
      <Modal 
        isOpen={showGoalModal} 
        onClose={() => setShowGoalModal(false)}
        title="Set Monthly Goal"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowGoalModal(false)} className="px-4 py-2 text-sm text-muted">Cancel</button>
            <button onClick={handleGoalSave} className="px-6 py-2 rounded-md bg-accent text-black font-bold text-sm">Save Goal</button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Month</label>
            <div className="px-3 py-2 bg-white/5 rounded border border-white/10 text-sm text-white">{startDate.substring(0, 7)}</div>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Revenue Target ({currency})</label>
            <input 
              type="number" 
              value={goalForm.revenue_target} 
              onChange={e => setGoalForm({...goalForm, revenue_target: parseInt(e.target.value) || 0})}
              className="w-full px-3 py-2 bg-white/5 rounded border border-white/10 text-white text-sm outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Closed Deals Target</label>
            <input 
              type="number" 
              value={goalForm.leads_target} 
              onChange={e => setGoalForm({...goalForm, leads_target: parseInt(e.target.value) || 0})}
              className="w-full px-3 py-2 bg-white/5 rounded border border-white/10 text-white text-sm outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Internal Task Target</label>
            <input 
              type="number" 
              value={goalForm.tasks_target} 
              onChange={e => setGoalForm({...goalForm, tasks_target: parseInt(e.target.value) || 0})}
              className="w-full px-3 py-2 bg-white/5 rounded border border-white/10 text-white text-sm outline-none focus:border-accent"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

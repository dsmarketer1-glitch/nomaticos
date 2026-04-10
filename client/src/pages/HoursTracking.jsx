import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { getClients, getTasks } from '../lib/api';
import { getLocalToday } from '../lib/date';
import ClientAvatar from '../components/ClientAvatar';

export default function HoursTracking() {
  const [clients, setClients] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterClient, setFilterClient] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(getLocalToday());

  const fetchData = useCallback(async () => {
    try {
      const [c, t] = await Promise.all([getClients(), getTasks()]);
      setClients(c);
      // Filter only tasks with hours
      setTasks(t.filter(task => task.hours > 0));
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredTasks = tasks.filter(t => {
    if (filterClient && t.client_id !== filterClient) return false;
    if (startDate && t.date < startDate) return false;
    if (endDate && t.date > endDate) return false;
    return true;
  });

  const exportToExcel = () => {
    const data = filteredTasks.map((t, index) => ({
      'Sr. No.': index + 1,
      'Date': t.date,
      'Client': t.client_name,
      'Task Details': t.title,
      'Category': t.category,
      'Hrs': t.hours,
      'Remark': t.remark || '',
      'Status': t.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Hours Log');
    
    // Auto-size columns
    const max_width = data.reduce((w, r) => Math.max(w, r['Task Details'].length), 10);
    worksheet['!cols'] = [
      { wch: 6 },  // Sr. No.
      { wch: 12 }, // Date
      { wch: 15 }, // Client
      { wch: Math.min(max_width, 50) }, // Task Details
      { wch: 12 }, // Category
      { wch: 6 },  // Hrs
      { wch: 30 }, // Remark
      { wch: 10 }  // Status
    ];

    XLSX.writeFile(workbook, `Hours_Log_${getLocalToday()}.xlsx`);
  };

  const totalHours = filteredTasks.reduce((sum, t) => sum + (t.hours || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg" style={{ color: 'var(--text-muted)' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-head text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Hours Tracking</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Monitor and export billable hours across clients</p>
        </div>
        <button
          onClick={exportToExcel}
          className="px-5 py-2.5 rounded-input text-sm font-semibold btn-press flex items-center gap-2"
          style={{ backgroundColor: 'var(--accent)', color: '#000' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="build/assets/excel-icon.svg" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export to Excel
        </button>
      </div>

      {/* Filters & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <div className="lg:col-span-3 rounded-card border p-4 flex flex-wrap items-end gap-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Client</label>
            <select
              value={filterClient}
              onChange={e => setFilterClient(e.target.value)}
              className="w-full px-3 py-2 rounded-input border text-sm"
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
            >
              <option value="">All Clients</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>From</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="px-3 py-2 rounded-input border text-sm"
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>To</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="px-3 py-2 rounded-input border text-sm"
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
            />
          </div>
          <button
            onClick={() => { setFilterClient(''); setStartDate(''); setEndDate(''); }}
            className="px-3 py-2 text-xs font-medium"
            style={{ color: 'var(--red)' }}
          >
            Reset
          </button>
        </div>

        <div className="rounded-card border p-4 text-center flex flex-col justify-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
          <div className="text-2xl font-head font-bold" style={{ color: 'var(--accent)' }}>{totalHours}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Total Logged Hours</div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-card border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>Sr. No.</th>
                <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>Client</th>
                <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>Task Details</th>
                <th className="px-4 py-3 text-center text-xs font-semibold" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>Hrs</th>
                <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>Remark</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                    No hours logged for the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t, idx) => (
                  <tr key={t.id} style={{ borderBottom: idx < filteredTasks.length - 1 ? '1px solid var(--border-default)' : 'none' }}>
                    <td className="px-4 py-4" style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td className="px-4 py-4 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{t.date}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <ClientAvatar name={t.client_name} size={24} />
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{t.client_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t.title}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{t.category}</div>
                    </td>
                    <td className="px-4 py-4 text-center font-bold" style={{ color: 'var(--accent)' }}>{t.hours}</td>
                    <td className="px-4 py-4">
                      <p className="text-xs max-w-xs truncate" style={{ color: 'var(--text-muted)' }} title={t.remark}>
                        {t.remark || '—'}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

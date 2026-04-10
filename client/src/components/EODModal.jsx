import { useState, useEffect } from 'react';
import Modal from './Modal';
import { getTasks } from '../lib/api';
import { getLocalToday, getLocalTomorrow } from '../lib/date';

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function EODModal({ isOpen, onClose, isDark }) {
  const [todayTasks, setTodayTasks] = useState([]);
  const [tomorrowTasks, setTomorrowTasks] = useState([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const today = getLocalToday();
  const tomorrow = getLocalTomorrow();

  useEffect(() => {
    if (isOpen) {
      setSent(false);
      getTasks({ date: today }).then(setTodayTasks).catch(() => {});
      getTasks({ date: tomorrow }).then(setTomorrowTasks).catch(() => {});
    }
  }, [isOpen, today, tomorrow]);

  const completed = todayTasks.filter(t => t.status === 'Done');
  const pending = todayTasks.filter(t => t.status !== 'Done');

  const handleSendReport = () => {
    setSending(true);
    const report = `
===== NOMATIC OS — END OF DAY REPORT =====
Date: ${formatDate(today)}

Summary:
- Total tasks today: ${todayTasks.length}
- Completed: ${completed.length}
- Pending: ${pending.length}

Completed Tasks:
${completed.length > 0 ? completed.map(t => `  - ${t.title} (${t.client_name})`).join('\n') : '  None'}

Pending Tasks:
${pending.length > 0 ? pending.map(t => `  - ${t.title} (${t.client_name}) — ${t.status}`).join('\n') : '  All done!'}

Tomorrow's Preview (${tomorrowTasks.length} tasks):
${tomorrowTasks.length > 0 ? tomorrowTasks.slice(0, 5).map(t => `  - ${t.title} (${t.client_name})`).join('\n') : '  No tasks scheduled'}
${tomorrowTasks.length > 5 ? `  ...and ${tomorrowTasks.length - 5} more` : ''}

==========================================
    `.trim();

    console.log(report);
    setTimeout(() => {
      setSending(false);
      setSent(true);
    }, 1500);
  };

  const footer = (
    <>
      <button
        onClick={onClose}
        className="px-4 py-2 rounded-input text-sm font-medium border btn-press transition-colors"
        style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
      >
        Close
      </button>
      <button
        onClick={handleSendReport}
        disabled={sending || sent}
        className="px-5 py-2 rounded-input text-sm font-semibold btn-press transition-colors disabled:opacity-50"
        style={{
          backgroundColor: sent ? 'var(--green)' : 'var(--accent)',
          color: sent ? '#fff' : '#000',
        }}
      >
        {sending ? 'Sending...' : sent ? 'Report Sent' : 'Send Report'}
      </button>
    </>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="End of Day Report" size="large" footer={footer}>
      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Today', value: todayTasks.length, color: 'var(--accent)' },
            { label: 'Completed', value: completed.length, color: 'var(--green)' },
            { label: 'Pending', value: pending.length, color: 'var(--red)' },
          ].map(stat => (
            <div key={stat.label} className="rounded-card p-4 border text-center"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
              <div className="text-2xl font-head font-bold" style={{ color: stat.color }}>
                {stat.value}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Completed Tasks */}
        <div>
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--green)' }}>
            Completed ({completed.length})
          </h3>
          {completed.length > 0 ? (
            <div className="space-y-1.5">
              {completed.map(t => (
                <div key={t.id} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg"
                  style={{ backgroundColor: 'var(--bg-card)' }}>
                  <span style={{ color: 'var(--text-primary)' }}>{t.title}</span>
                  <span className="text-xs ml-auto" style={{ color: 'var(--accent)' }}>{t.client_name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No tasks completed today</p>
          )}
        </div>

        {/* Pending Tasks */}
        <div>
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--red)' }}>
            Pending ({pending.length})
          </h3>
          {pending.length > 0 ? (
            <div className="space-y-1.5">
              {pending.map(t => (
                <div key={t.id} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg"
                  style={{ backgroundColor: 'var(--bg-card)' }}>
                  <span style={{ color: 'var(--text-primary)' }}>{t.title}</span>
                  <span className="text-xs ml-auto" style={{ color: 'var(--accent)' }}>{t.client_name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>All tasks done!</p>
          )}
        </div>

        {/* Tomorrow Preview */}
        <div>
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--blue)' }}>
            Tomorrow's Preview
          </h3>
          {tomorrowTasks.length > 0 ? (
            <div className="space-y-1.5">
              {tomorrowTasks.slice(0, 5).map(t => (
                <div key={t.id} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg"
                  style={{ backgroundColor: 'var(--bg-card)' }}>
                  <span style={{ color: 'var(--text-primary)' }}>{t.title}</span>
                  <span className="text-xs ml-auto" style={{ color: 'var(--accent)' }}>{t.client_name}</span>
                </div>
              ))}
              {tomorrowTasks.length > 5 && (
                <p className="text-xs pl-3" style={{ color: 'var(--text-muted)' }}>
                  +{tomorrowTasks.length - 5} more tasks
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No tasks scheduled for tomorrow</p>
          )}
        </div>
      </div>
    </Modal>
  );
}

const STATUS_COLORS_DARK = {
  'To Do':       { bg: '#1e293b', text: '#94a3b8', border: '#334155' },
  'In Progress': { bg: '#1e3a5f', text: '#60a5fa', border: '#2563eb' },
  'Done':        { bg: '#14532d', text: '#4ade80', border: '#16a34a' },
  'Blocked':     { bg: '#450a0a', text: '#f87171', border: '#dc2626' },
};

const STATUS_COLORS_LIGHT = {
  'To Do':       { bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1' },
  'In Progress': { bg: '#dbeafe', text: '#2563eb', border: '#93c5fd' },
  'Done':        { bg: '#dcfce7', text: '#16a34a', border: '#86efac' },
  'Blocked':     { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' },
};

export default function StatusBadge({ status, onClick, isDark = true }) {
  const colors = isDark ? STATUS_COLORS_DARK : STATUS_COLORS_LIGHT;
  const c = colors[status] || colors['To Do'];

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center px-2.5 py-1 rounded-pill text-xs font-medium border transition-all duration-150 ${
        onClick ? 'cursor-pointer hover:opacity-80' : ''
      }`}
      style={{
        backgroundColor: c.bg,
        color: c.text,
        borderColor: c.border,
      }}
    >
      {status}
    </span>
  );
}

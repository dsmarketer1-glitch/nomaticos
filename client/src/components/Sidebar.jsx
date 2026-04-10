import { NavLink } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/clients', label: 'Clients' },
  { to: '/tasks', label: 'Tasks' },
  { to: '/payments', label: 'Payments' },
  { to: '/hours-tracking', label: 'Hours Tracking' },
  { to: '/crm', label: 'CRM & Pipeline' },
  { to: '/settings', label: 'Settings' },
];

export default function Sidebar({ isDark, toggleTheme, clientCount = 0, taskCount = 0 }) {
  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] flex flex-col border-r z-50 transition-theme"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-default)',
      }}>
      {/* Logo */}
      <div className="px-5 pt-7 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <img src="/logo.png" alt="NAD Logo" className="w-10 h-10 object-contain rounded-lg" />
          <div className="flex flex-col">
            <h1 className="font-head text-lg font-bold tracking-tight leading-none">
              <span className="text-accent">Nomatic</span>
              <span style={{ color: 'var(--text-primary)' }}> OS</span>
            </h1>
            <p className="text-[10px] uppercase font-bold tracking-widest mt-1 opacity-50" style={{ color: 'var(--text-muted)' }}>
              Agency Operating System
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 mt-2">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-input text-sm font-medium mb-1 transition-all duration-200 ${
                isActive
                  ? 'bg-amber-500/10 text-accent border-l-2 border-accent'
                  : 'hover:bg-white/5 dark:hover:bg-white/5'
              }`
            }
            style={({ isActive }) => ({
              color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
            })}
          >
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="px-4 pb-5">
        <ThemeToggle isDark={isDark} toggleTheme={toggleTheme} />
        <div className="mt-3 pt-3 border-t text-xs" style={{
          borderColor: 'var(--border-default)',
          color: 'var(--text-muted)',
        }}>
          <span>{clientCount} client{clientCount !== 1 ? 's' : ''}</span>
          <span className="mx-1.5">·</span>
          <span>{taskCount} open task{taskCount !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </aside>
  );
}

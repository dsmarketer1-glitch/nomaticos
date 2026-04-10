export default function ThemeToggle({ isDark, toggleTheme }) {
  return (
    <button
      onClick={toggleTheme}
      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-input text-sm font-medium border btn-press transition-all duration-200"
      style={{
        borderColor: 'var(--border-default)',
        color: 'var(--text-secondary)',
        backgroundColor: 'transparent',
      }}
      id="theme-toggle-btn"
    >
      <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
    </button>
  );
}

import { useState } from 'react';

export default function Settings() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('nomatic_claude_key') || '');
  const [name, setName] = useState(() => localStorage.getItem('nomatic_user_name') || 'Deepak');
  const [email, setEmail] = useState(() => localStorage.getItem('nomatic_eod_email') || 'nomaticai1@gmail.com');
  const [currency, setCurrency] = useState(() => localStorage.getItem('nomatic_currency') || '₹');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem('nomatic_claude_key', apiKey);
    localStorage.setItem('nomatic_user_name', name);
    localStorage.setItem('nomatic_eod_email', email);
    localStorage.setItem('nomatic_currency', currency);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="animate-fadeIn max-w-xl">
      <h1 className="font-head text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Settings</h1>

      <div className="rounded-card border p-6 space-y-5" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
        {/* Claude API Key */}
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Claude API Key
          </label>
          <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
            Required for AI-powered monthly plan generation. Get your key from{' '}
            <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--blue)' }}>
              console.anthropic.com
            </a>
          </p>
          <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
            className="w-full px-3 py-2.5 rounded-input border text-sm"
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
            placeholder="sk-ant-..." id="input-api-key" />
        </div>

        {/* Your Name */}
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Your Name
          </label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2.5 rounded-input border text-sm"
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
            placeholder="Deepak" id="input-user-name" />
        </div>

        {/* EOD Email */}
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            EOD Report Email
          </label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 rounded-input border text-sm"
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
            placeholder="nomaticai1@gmail.com" id="input-eod-email" />
        </div>

        {/* Currency */}
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Default Currency Symbol
          </label>
          <input type="text" value={currency} onChange={e => setCurrency(e.target.value)}
            className="w-full max-w-[80px] px-3 py-2.5 rounded-input border text-sm text-center"
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
            placeholder="₹" id="input-currency" />
        </div>

        {/* Push Notifications */}
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Mobile Push Notifications
          </label>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            Enabled scheduled reminders on your phone (every 2 hours + CRM follow-ups).
          </p>
          <button 
            onClick={async () => {
              const { requestNotificationPermission, subscribeUserToPush } = await import('../lib/notifications');
              const granted = await requestNotificationPermission();
              if (granted) {
                const subbed = await subscribeUserToPush();
                if (subbed) alert('Notifications Enabled Successfully!');
                else alert('Failed to register device. Check console.');
              } else {
                alert('Permission denied. Please enable notifications in your browser settings.');
              }
            }}
            className="px-6 py-2.5 rounded-input text-sm font-semibold btn-press border border-white/10 hover:bg-white/5 transition-colors"
            style={{ color: 'var(--text-primary)' }}
            id="enable-notifications-btn"
          >
            Enable on this Device
          </button>
        </div>

        {/* Save Button */}
        <div className="pt-2 flex items-center justify-between">
          <button onClick={handleSave}
            className="px-6 py-2.5 rounded-input text-sm font-semibold btn-press transition-colors"
            style={{
              backgroundColor: saved ? 'var(--green)' : 'var(--accent)',
              color: saved ? '#fff' : '#000',
            }}
            id="save-settings-btn">
            {saved ? 'Saved' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="mt-6 rounded-card border p-5" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
        <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>About Nomatic OS</h3>
        <div className="space-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          <p>Version 1.0 — Phase 1</p>
          <p>Built for Deepak | Nomatic AI</p>
          <p>All data is stored locally in SQLite at ./database/nomatic.db</p>
        </div>
      </div>
    </div>
  );
}

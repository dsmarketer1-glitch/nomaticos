import { useState, useEffect, useCallback } from 'react';
import { getClients, createClient, updateClient, deleteClient, getTasks, bulkCreateTasks } from '../lib/api';
import { callClaude } from '../lib/claude';
import ClientAvatar from '../components/ClientAvatar';
import Modal from '../components/Modal';
import MultiSelect from '../components/MultiSelect';

const SERVICES_LIST = [
  'Social Media Marketing (SMM)',
  'Search Engine Optimization (SEO)',
  'Performance Marketing',
  'Website Development',
  'Branding',
  'Graphic Design',
  'Email Marketing',
  'Content Marketing',
  'LinkedIn Marketing',
];

const SERVICE_ACCESSES = {
  'Social Media Marketing (SMM)': ['Meta Business Suite', 'Facebook Page Admin', 'Instagram Account', 'LinkedIn Page', 'Twitter/X Account'],
  'Search Engine Optimization (SEO)': ['Google Analytics (GA4)', 'Google Search Console', 'Google Tag Manager', 'Website Admin (CMS)', 'Screaming Frog / Semrush Access'],
  'Performance Marketing': ['Google Ads Account', 'Meta Ads Manager', 'Google Analytics (GA4)', 'Google Tag Manager', 'Google Merchant Center'],
  'Website Development': ['Website Admin Access', 'Hosting cPanel / FTP', 'Domain Registrar Access', 'GitHub / GitLab Repository', 'Staging Environment URL'],
  'Branding': ['Brand Asset Drive / Folder', 'Previous Brand Guidelines', 'Canva Account (if any)'],
  'Graphic Design': ['Brand Asset Drive / Folder', 'Canva Account (if any)', 'Adobe Creative Cloud (if any)'],
  'Email Marketing': ['Email Platform (Klaviyo/Mailchimp/etc.)', 'Domain DNS Access', 'Google Analytics (GA4)'],
  'Content Marketing': ['Blog / CMS Admin Access', 'Google Analytics (GA4)', 'Google Search Console', 'Brand Asset Drive'],
  'LinkedIn Marketing': ['LinkedIn Page Admin', 'LinkedIn Ads Account', 'Meta Business Suite (if cross-posting)'],
};

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function generateChecklist(services) {
  const seen = new Set();
  const items = [];
  for (const svc of services) {
    const accesses = SERVICE_ACCESSES[svc] || [];
    for (const label of accesses) {
      if (!seen.has(label)) {
        seen.add(label);
        items.push({ id: generateId(), label, granted: false, note: '' });
      }
    }
  }
  return items;
}

export default function Clients({ isDark }) {
  const [clients, setClients] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  // States for Edit Mode
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);

  const [form, setForm] = useState({ name: '', company: '', payout: '', payout_type: 'Monthly', location: '', website: '', services: [] });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [planMonth, setPlanMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [planGoal, setPlanGoal] = useState('');
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState('');
  const [planSuccess, setPlanSuccess] = useState('');

  const currency = localStorage.getItem('nomatic_currency') || '₹';

  const fetchData = useCallback(async () => {
    try {
      const [c, t] = await Promise.all([getClients(), getTasks()]);
      setClients(c);
      setAllTasks(t);
      if (selectedClient && !isEditing) {
        const updated = c.find(cl => cl.id === selectedClient.id);
        if (updated) setSelectedClient(updated);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      if (!err.response) {
        setError('Could not connect to server. Make sure the backend is running on port 3001.');
      } else {
        setError(`Server Error: ${err.response.data?.error || err.message}. Please check backend logs.`);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedClient, isEditing]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredClients = clients.filter(c => {
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.company || '').toLowerCase().includes(q);
  });

  const getClientTaskCount = (clientId) => allTasks.filter(t => t.client_id === clientId).length;
  const getClientOpenTaskCount = (clientId) => allTasks.filter(t => t.client_id === clientId && t.status !== 'Done').length;

  const handleAddClient = async () => {
    if (!form.name.trim()) { setFormError('Client name is required'); return; }
    setFormError('');
    setSaving(true);
    try {
      const checklist = generateChecklist(form.services);
      await createClient({
        id: generateId(),
        name: form.name.trim(),
        company: form.company.trim(),
        payout: parseInt(form.payout) || 0,
        payout_type: form.payout_type,
        location: form.location.trim(),
        website: form.website.trim(),
        services: form.services,
        checklist,
      });
      setForm({ name: '', company: '', payout: '', payout_type: 'Monthly', location: '', website: '', services: [] });
      setShowAddModal(false);
      fetchData();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to create client');
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = () => {
    setEditForm({ ...selectedClient });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm(null);
  };

  const handleUpdateClient = async () => {
    if (!editForm.name.trim()) { alert('Name is required'); return; }
    setSaving(true);
    try {
      const updated = await updateClient(editForm.id, {
        name: editForm.name.trim(),
        company: editForm.company.trim(),
        payout: parseInt(editForm.payout) || 0,
        payout_type: editForm.payout_type,
        location: editForm.location.trim(),
        website: editForm.website.trim(),
        services: editForm.services
      });
      setSelectedClient(updated);
      setIsEditing(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update client');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClient = async (id, e) => {
    e?.stopPropagation();
    if (!confirm('Delete this client and all their tasks?')) return;
    try {
      await deleteClient(id);
      setSelectedClient(null);
      setShowViewModal(false);
      fetchData();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleChecklistToggle = async (client, itemId) => {
    const updatedChecklist = client.checklist.map(item =>
      item.id === itemId ? { ...item, granted: !item.granted } : item
    );
    await updateClient(client.id, { checklist: updatedChecklist });
    setSelectedClient({ ...client, checklist: updatedChecklist });
    fetchData();
  };

  const handleGeneratePlan = async () => {
    if (!planGoal.trim()) { setPlanError('Please enter a monthly goal'); return; }
    setPlanError('');
    setPlanSuccess('');
    setPlanLoading(true);

    try {
      const [year, month] = planMonth.split('-').map(Number);
      const totalDays = new Date(year, month, 0).getDate();
      const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });

      const prompt = `Generate a monthly marketing task plan for:
Client: ${selectedClient.name} (${selectedClient.company || 'N/A'})
Services: ${selectedClient.services.join(', ')}
Monthly Goal: ${planGoal}
Month: ${planMonth} (${monthName}, ${totalDays} days)

Return a JSON array of tasks. Each task:
{ "title": string, "dayOfMonth": number (1-${totalDays}), "category": string }

Available categories: General, SEO, Social Media, Ads, Plan, Followup, New Client, SaaS.

Rules:
- Generate 2-4 tasks per week spread across the month
- Tasks must be specific and actionable (not generic)
- Match tasks to the services and goal
- Use the most relevant category from the list provided
- Working days only (Monday-Saturday)
- Return ONLY the JSON array, no other text`;

      const tasks = await callClaude(prompt);
      if (!Array.isArray(tasks)) throw new Error('Invalid AI response');

      const bulkTasks = tasks.map(t => ({
        id: generateId(),
        client_id: selectedClient.id,
        client_name: selectedClient.name,
        title: t.title,
        date: `${year}-${String(month).padStart(2, '0')}-${String(t.dayOfMonth).padStart(2, '0')}`,
        status: 'To Do',
        category: t.category || 'General',
        source: 'ai',
      }));

      await bulkCreateTasks(bulkTasks);
      setPlanSuccess(`${bulkTasks.length} tasks generated for ${monthName}!`);
      fetchData();
    } catch (err) {
      setPlanError(err.message || 'AI generation failed. Check your API key and try again.');
    } finally {
      setPlanLoading(false);
    }
  };

  const openViewModal = (client) => { 
    setSelectedClient(client); 
    setIsEditing(false);
    setShowViewModal(true); 
  };
  const openPlanModal = (client, e) => {
    e?.stopPropagation();
    setSelectedClient(client);
    setPlanGoal('');
    setPlanError('');
    setPlanSuccess('');
    setShowPlanModal(true);
  };

  const getChecklistProgress = (checklist) => {
    if (!checklist || checklist.length === 0) return 0;
    return Math.round((checklist.filter(i => i.granted).length / checklist.length) * 100);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="text-lg" style={{ color: 'var(--text-muted)' }}>Loading...</div>
    </div>;
  }

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-head text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Clients</h1>
        <button
          onClick={() => { setFormError(''); setForm({ name: '', company: '', payout: '', payout_type: 'Monthly', location: '', website: '', services: [] }); setShowAddModal(true); }}
          className="px-5 py-2.5 rounded-input text-sm font-semibold btn-press transition-colors"
          style={{ backgroundColor: 'var(--accent)', color: '#000' }}
          id="add-client-btn"
        >
          + Add Client
        </button>
      </div>

      <div className="mb-5">
        <input
          type="text" placeholder="Search by name or company..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-[340px] px-4 py-2.5 rounded-input border text-sm transition-colors"
          style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
          id="client-search"
        />
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-input text-sm flex items-center justify-between" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--red)', border: '1px solid var(--red)' }}>
          <span>{error}</span>
          <button 
            onClick={() => { setError(''); setLoading(true); fetchData(); }}
            className="px-3 py-1 rounded border border-red-500/30 hover:bg-red-500/10 transition-colors text-xs font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {filteredClients.length === 0 ? (
        <div className="text-center py-16">
          <h2 className="font-head text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            {search ? 'No clients found' : 'No clients yet'}
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            {search ? 'Try a different search term' : 'Add your first client to get started'}
          </p>
          {!search && (
            <button onClick={() => setShowAddModal(true)}
              className="px-5 py-2.5 rounded-input text-sm font-semibold btn-press"
              style={{ backgroundColor: 'var(--accent)', color: '#000' }}>
              + Add Client
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {filteredClients.map(client => {
            const progress = getChecklistProgress(client.checklist);
            return (
              <div key={client.id}
                onClick={() => openViewModal(client)}
                className="rounded-card border p-5 cursor-pointer card-hover transition-theme"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
                <div className="flex items-start gap-3 mb-3">
                  <ClientAvatar name={client.name} size={42} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-head text-base font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                      {client.name}
                    </h3>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{client.company || '—'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-semibold block" style={{ color: 'var(--accent)' }}>
                      {currency}{client.payout?.toLocaleString() || 0}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {client.payout_type === 'One-time' ? '(One-time)' : '/mo'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {(client.services || []).slice(0, 3).map(s => (
                    <span key={s} className="px-2 py-0.5 rounded-pill text-[10px] font-medium border"
                      style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>{s}</span>
                  ))}
                  {(client.services || []).length > 3 && (
                    <span className="px-2 py-0.5 rounded-pill text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                      +{client.services.length - 3} more
                    </span>
                  )}
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Onboarding</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-input)' }}>
                    <div className="h-full rounded-full progress-fill" style={{ width: `${progress}%`, backgroundColor: progress === 100 ? 'var(--green)' : 'var(--accent)' }} />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--border-default)' }}>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {getClientTaskCount(client.id)} tasks · {getClientOpenTaskCount(client.id)} open
                  </span>
                  <div className="flex gap-2">
                    <button onClick={(e) => openPlanModal(client, e)}
                      className="px-3 py-1.5 rounded-input text-xs font-medium border btn-press transition-colors"
                      style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
                      Generate Plan
                    </button>
                    <button onClick={(e) => handleDeleteClient(client.id, e)}
                      className="px-2 py-1.5 rounded-input text-xs btn-press transition-colors"
                      style={{ color: 'var(--red)' }}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD CLIENT MODAL */}
      <Modal
        isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Client"
        footer={<>
          <button onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-input text-sm font-medium border btn-press" style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>Cancel</button>
          <button onClick={handleAddClient} disabled={saving} className="px-5 py-2 rounded-input text-sm font-semibold btn-press disabled:opacity-50" style={{ backgroundColor: 'var(--accent)', color: '#000' }}>
            {saving ? 'Saving...' : 'Save Client'}
          </button>
        </>}
      >
        <div className="space-y-4">
          {formError && <div className="px-3 py-2 rounded-input text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--red)', border: '1px solid var(--red)' }}>{formError}</div>}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Client Name *</label>
            <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              className="w-full px-3 py-2.5 rounded-input border text-sm" style={{ backgroundColor: 'var(--bg-input)', borderColor: !form.name.trim() && formError ? 'var(--red)' : 'var(--border-default)', color: 'var(--text-primary)' }}
              placeholder="Enter client name" id="input-client-name" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Company Name</label>
            <input type="text" value={form.company} onChange={e => setForm({...form, company: e.target.value})}
              className="w-full px-3 py-2.5 rounded-input border text-sm" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
              placeholder="Enter company name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Payout Amount ({currency})</label>
              <input type="number" value={form.payout} onChange={e => setForm({...form, payout: e.target.value})}
                className="w-full px-3 py-2.5 rounded-input border text-sm" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                placeholder="25000" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Payout Frequency</label>
              <select value={form.payout_type} onChange={e => setForm({...form, payout_type: e.target.value})}
                className="w-full px-3 py-2.5 rounded-input border text-sm" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
                <option value="Monthly">Monthly</option>
                <option value="One-time">One-time</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Location</label>
              <input type="text" value={form.location} onChange={e => setForm({...form, location: e.target.value})}
                className="w-full px-3 py-2.5 rounded-input border text-sm" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                placeholder="City, Country" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Website URL</label>
              <input type="url" value={form.website} onChange={e => setForm({...form, website: e.target.value})}
                className="w-full px-3 py-2.5 rounded-input border text-sm" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                placeholder="https://..." />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Services Opted For</label>
            <MultiSelect options={SERVICES_LIST} selected={form.services} onChange={s => setForm({...form, services: s})} placeholder="Select services..." />
          </div>
          {form.services.length > 0 && (
            <div className="rounded-input border p-3" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)' }}>
              <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Auto-generated Checklist Preview</h4>
              {(() => {
                const items = generateChecklist(form.services);
                return (<>
                  {items.slice(0, 5).map(item => (<div key={item.id} className="text-xs py-0.5" style={{ color: 'var(--text-muted)' }}>- {item.label}</div>))}
                  {items.length > 5 && <div className="text-xs mt-1" style={{ color: 'var(--accent)' }}>+{items.length - 5} more items</div>}
                </>);
              })()}
            </div>
          )}
        </div>
      </Modal>

      {/* VIEW CLIENT MODAL */}
      {selectedClient && (
        <Modal isOpen={showViewModal} onClose={() => { setShowViewModal(false); setSelectedClient(null); setIsEditing(false); }} 
               title={isEditing ? "Edit Client Details" : "Client Details"} size="large"
          footer={
            isEditing ? (
              <div className="flex gap-2 w-full justify-end">
                <button onClick={handleCancelEdit} className="px-5 py-2 rounded-input text-sm font-medium border" style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>Cancel</button>
                <button onClick={handleUpdateClient} disabled={saving} className="px-6 py-2 rounded-input text-sm font-bold" style={{ backgroundColor: 'var(--accent)', color: '#000' }}>
                  {saving ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            ) : (
              <div className="flex gap-2 w-full justify-end">
                <button onClick={handleStartEdit} className="px-5 py-2 rounded-input text-sm font-medium border" style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>Edit Details</button>
                <button onClick={(e) => { setShowViewModal(false); openPlanModal(selectedClient, e); }} className="px-5 py-2 rounded-input text-sm font-semibold btn-press" style={{ backgroundColor: 'var(--accent)', color: '#000' }}>Generate Monthly Plan</button>
              </div>
            )
          }
        >
          <div className="space-y-5">
            {!isEditing ? (
              <>
                <div className="flex items-center gap-4">
                  <ClientAvatar name={selectedClient.name} size={56} />
                  <div>
                    <h3 className="font-head text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{selectedClient.name}</h3>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{selectedClient.company || '—'} {selectedClient.location ? `· ${selectedClient.location}` : ''}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: `Payout (${selectedClient.payout_type})`, value: `${currency}${selectedClient.payout?.toLocaleString('en-IN') || 0}`, color: 'var(--accent)' },
                    { label: 'Total Tasks', value: getClientTaskCount(selectedClient.id), color: 'var(--blue)' },
                    { label: 'Services', value: (selectedClient.services || []).length, color: 'var(--purple)' },
                  ].map(s => (
                    <div key={s.label} className="rounded-card p-4 border text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
                      <div className="text-xl font-head font-bold" style={{ color: s.color }}>{s.value}</div>
                      <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {selectedClient.website && (
                  <div>
                    <h4 className="text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Website</h4>
                    <a href={selectedClient.website} target="_blank" rel="noopener noreferrer" className="text-sm underline" style={{ color: 'var(--blue)' }}>{selectedClient.website}</a>
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Services</h4>
                  <div className="flex flex-wrap gap-2">
                    {(selectedClient.services || []).map(s => (
                      <span key={s} className="px-2.5 py-1 rounded-pill text-xs font-medium border" style={{ borderColor: 'var(--border-default)', color: 'var(--accent)' }}>{s}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Onboarding Checklist</h4>
                    <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>{getChecklistProgress(selectedClient.checklist)}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden mb-3" style={{ backgroundColor: 'var(--bg-input)' }}>
                    <div className="h-full rounded-full progress-fill" style={{ width: `${getChecklistProgress(selectedClient.checklist)}%`, backgroundColor: getChecklistProgress(selectedClient.checklist) === 100 ? 'var(--green)' : 'var(--accent)' }} />
                  </div>
                  <div className="space-y-1">
                    {(selectedClient.checklist || []).map(item => (
                      <div key={item.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors hover:bg-white/5" style={{ backgroundColor: 'var(--bg-input)' }}>
                        <button onClick={() => handleChecklistToggle(selectedClient, item.id)}
                          className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all duration-150"
                          style={{ borderColor: item.granted ? 'var(--green)' : 'var(--border-default)', backgroundColor: item.granted ? 'var(--green)' : 'transparent' }}>
                          {item.granted && <span className="text-white text-xs font-bold">✓</span>}
                        </button>
                        <span className={`text-sm ${item.granted ? 'line-through opacity-60' : ''}`} style={{ color: 'var(--text-primary)' }}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4 py-2">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Client Name</label>
                  <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}
                    className="w-full px-3 py-2.5 rounded-input border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Company Name</label>
                  <input type="text" value={editForm.company} onChange={e => setEditForm({...editForm, company: e.target.value})}
                    className="w-full px-3 py-2.5 rounded-input border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Payout Amount</label>
                    <input type="number" value={editForm.payout} onChange={e => setEditForm({...editForm, payout: e.target.value})}
                      className="w-full px-3 py-2.5 rounded-input border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Payout Frequency</label>
                    <select value={editForm.payout_type} onChange={e => setEditForm({...editForm, payout_type: e.target.value})}
                      className="w-full px-3 py-2.5 rounded-input border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
                      <option value="Monthly">Monthly</option>
                      <option value="One-time">One-time</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Location</label>
                    <input type="text" value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})}
                      className="w-full px-3 py-2.5 rounded-input border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Website URL</label>
                    <input type="url" value={editForm.website} onChange={e => setEditForm({...editForm, website: e.target.value})}
                      className="w-full px-3 py-2.5 rounded-input border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Services</label>
                  <MultiSelect options={SERVICES_LIST} selected={editForm.services} onChange={s => setEditForm({...editForm, services: s})} />
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* GENERATE PLAN MODAL */}
      {selectedClient && (
        <Modal isOpen={showPlanModal} onClose={() => setShowPlanModal(false)} title={`Generate Plan — ${selectedClient.name}`}
          footer={<>
            <button onClick={() => setShowPlanModal(false)} className="px-4 py-2 rounded-input text-sm font-medium border btn-press" style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>Cancel</button>
            <button onClick={handleGeneratePlan} disabled={planLoading} className="px-5 py-2 rounded-input text-sm font-semibold btn-press disabled:opacity-50" style={{ backgroundColor: 'var(--accent)', color: '#000' }}>
              {planLoading ? 'Generating...' : 'Generate with AI'}
            </button>
          </>}
        >
          <div className="space-y-4">
            <div className="rounded-input p-3 border" style={{ backgroundColor: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.2)' }}>
              <p className="text-sm" style={{ color: 'var(--blue)' }}>AI will create a day-wise task plan based on your goal</p>
            </div>
            {planError && <div className="px-3 py-2 rounded-input text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--red)', border: '1px solid var(--red)' }}>{planError}</div>}
            {planSuccess && <div className="px-3 py-2 rounded-input text-sm" style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: 'var(--green)', border: '1px solid var(--green)' }}>{planSuccess}</div>}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Month</label>
              <input type="month" value={planMonth} onChange={e => setPlanMonth(e.target.value)}
                className="w-full px-3 py-2.5 rounded-input border text-sm" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Monthly Goal *</label>
              <textarea value={planGoal} onChange={e => setPlanGoal(e.target.value)} rows={3}
                className="w-full px-3 py-2.5 rounded-input border text-sm resize-none" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                placeholder="e.g., Grow Instagram to 5K, generate 50 leads from Google Ads" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Services</label>
              <div className="flex flex-wrap gap-2">
                {(selectedClient.services || []).map(s => (
                  <span key={s} className="px-2.5 py-1 rounded-pill text-xs font-medium" style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: 'var(--accent)' }}>{s}</span>
                ))}
              </div>
            </div>
            {planLoading && (
              <div className="flex items-center justify-center py-6">
                <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
                <span className="ml-3 text-sm" style={{ color: 'var(--text-muted)' }}>AI is generating your plan...</span>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

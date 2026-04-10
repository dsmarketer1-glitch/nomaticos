import { useState, useEffect, useCallback, useMemo } from 'react';
import { getLeads, createLead, updateLead, deleteLead, convertLead, uploadFile } from '../lib/api';
import { getLocalToday } from '../lib/date';
import Modal from '../components/Modal';

const STATUS_OPTIONS = ['Cold', 'Warm', 'Hot', 'Lost', 'Closed'];
const STATUS_COLORS = {
  Cold: { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6' },
  Warm: { bg: 'rgba(245,158,11,0.1)', text: '#f59e0b' },
  Hot: { bg: 'rgba(239,68,68,0.1)', text: '#ef4444' },
  Lost: { bg: 'rgba(107,114,128,0.1)', text: '#6b7280' },
  Closed: { bg: 'rgba(16,185,129,0.1)', text: '#10b981' },
};

const generateId = () => 'lead_' + Math.random().toString(36).substr(2, 9);

export default function CRM() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [view, setView] = useState('pipeline'); // 'pipeline' or 'closed'
  const [form, setForm] = useState({
    client_name: '', company_name: '', source: '', medium: '', location: '', 
    service_looking_for: '', website: '', facebook_url: '', instagram_url: '', 
    linkedin_url: '', youtube_url: '', contact_email: '', contact_phone: '',
    first_touch_date: getLocalToday(), first_touch_details: '',
    followup1_date: '', followup1_details: '', followup2_date: '', followup2_details: '',
    followup3_date: '', followup3_details: '', followup4_date: '', followup4_details: '',
    followup5_date: '', followup5_details: '',
    status: 'Cold', 
    pitched_amount: '0',
    closed_amount: '0', 
    proposal_url: '',
    action_plan_url: '',
    work_start_date: '',
    referral_name: '',
    should_convert: false
  });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const data = await getLeads();
      setLeads(data);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAddModal = () => {
    setEditingLead(null);
    setActiveTab('basic');
    setForm({
      client_name: '', company_name: '', source: '', medium: '', location: '', 
      service_looking_for: '', website: '', facebook_url: '', instagram_url: '', 
      linkedin_url: '', youtube_url: '', contact_email: '', contact_phone: '',
      first_touch_date: getLocalToday(), first_touch_details: '',
      followup1_date: '', followup1_details: '', followup2_date: '', followup2_details: '',
      followup3_date: '', followup3_details: '', followup4_date: '', followup4_details: '',
      followup5_date: '', followup5_details: '',
      status: 'Cold', 
      pitched_amount: '0',
      closed_amount: '0', 
      proposal_url: '',
      action_plan_url: '',
      work_start_date: '',
      referral_name: '',
      should_convert: false
    });
    setShowModal(true);
  };

  const openEditModal = (lead) => {
    setEditingLead(lead);
    setActiveTab('basic');
    setForm({
      ...lead,
      pitched_amount: lead.pitched_amount?.toString() || '0',
      closed_amount: lead.closed_amount?.toString() || '0',
      referral_name: lead.referral_name || '',
      should_convert: !!lead.is_converted
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.client_name) { alert('Client Name is required'); return; }
    setSaving(true);
    try {
      if (editingLead) {
        await updateLead(editingLead.id, form);
        if (form.should_convert && !editingLead.is_converted) {
          await convertLead(editingLead.id);
        }
      } else {
        const id = generateId();
        await createLead({ ...form, id });
        if (form.should_convert) {
          await convertLead(id);
        }
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save lead:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      await deleteLead(id);
      fetchData();
    } catch (err) {
      console.error('Failed to delete lead:', err);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await updateLead(id, { status: newStatus });
      fetchData();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleFileUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { url } = await uploadFile(formData);
      setForm(prev => ({ ...prev, [field]: url }));
    } catch (err) {
      console.error('Failed to upload file:', err);
      alert('Failed to upload file');
    }
  };

  // Logic for tabbed view
  const pipelineLeads = useMemo(() => leads.filter(l => l.status !== 'Closed' && l.status !== 'Lost'), [leads]);
  const closedLeads = useMemo(() => leads.filter(l => l.status === 'Closed'), [leads]);

  const totalPipeline = useMemo(() => pipelineLeads.reduce((sum, l) => sum + (l.pitched_amount || 0), 0), [pipelineLeads]);
  const lifetimeClosed = useMemo(() => closedLeads.reduce((sum, l) => sum + (l.closed_amount || 0), 0), [closedLeads]);

  const thisMonthMetrics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthDeals = closedLeads.filter(l => {
      const dateStr = l.closed_at || l.created_at;
      if (!dateStr) return false;
      
      // SQLite timestamps often have spaces e.g. '2024-04-06 12:00:00'
      // We replace the space with 'T' for reliable cross-browser parsing
      const isoStr = dateStr.includes(' ') ? dateStr.replace(' ', 'T') : dateStr;
      const d = new Date(isoStr);
      
      return !isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    return {
      count: monthDeals.length,
      amount: monthDeals.reduce((sum, l) => sum + (l.closed_amount || 0), 0)
    };
  }, [closedLeads]);

  const currency = localStorage.getItem('nomatic_currency') || '₹';

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-lg" style={{ color: 'var(--text-muted)' }}>Loading...</div></div>;

  return (
    <div className="animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
        <div className="w-full md:w-auto">
          <h1 className="font-head text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>CRM & Pipeline</h1>
          <div className="flex gap-4 mt-2">
            <button 
              onClick={() => setView('pipeline')}
              className={`text-sm font-bold transition-all ${view === 'pipeline' ? 'text-accent border-b-2 border-accent' : 'text-muted hover:text-white'}`}
            >
              Pipeline
            </button>
            <button 
              onClick={() => setView('closed')}
              className={`text-sm font-bold transition-all ${view === 'closed' ? 'text-accent border-b-2 border-accent' : 'text-muted hover:text-white'}`}
            >
              Closed Deals
            </button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          {view === 'pipeline' ? (
            <div className="px-4 py-2 rounded-card border text-right flex-1 sm:flex-none" style={{ backgroundColor: 'rgba(245,158,11,0.05)', borderColor: 'var(--accent)' }}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Total Pipeline</div>
              <div className="text-lg font-bold" style={{ color: 'var(--accent)' }}>{currency}{totalPipeline.toLocaleString('en-IN')}</div>
            </div>
          ) : (
            <div className="flex gap-3 flex-1 sm:flex-none">
              <div className="px-4 py-2 rounded-card border text-right flex-1" style={{ backgroundColor: 'rgba(16,185,129,0.05)', borderColor: 'var(--green)' }}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Closed</div>
                <div className="text-lg font-bold" style={{ color: 'var(--green)' }}>{thisMonthMetrics.count} <span className="text-xs font-normal opacity-60">Deals</span></div>
              </div>
              <div className="px-4 py-2 rounded-card border text-right flex-1" style={{ backgroundColor: 'rgba(16,185,129,0.05)', borderColor: 'var(--green)' }}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Month Amt</div>
                <div className="text-lg font-bold" style={{ color: 'var(--green)' }}>{currency}{thisMonthMetrics.amount.toLocaleString('en-IN')}</div>
              </div>
            </div>
          )}
          <button
            onClick={openAddModal}
            className="px-5 py-2.5 rounded-input text-sm font-semibold btn-press flex items-center justify-center gap-2"
            style={{ backgroundColor: 'var(--accent)', color: '#000' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add New Lead
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>Lead Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>
                  {view === 'closed' ? 'Referral' : 'Source/Medium'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>
                  {view === 'closed' ? 'Source/Medium' : 'Status'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>
                  {view === 'closed' ? 'Amount' : 'Pitched'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>Service</th>
                <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>Contact</th>
                <th className="px-4 py-3 text-right text-xs font-semibold" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(view === 'pipeline' ? pipelineLeads : closedLeads).length === 0 ? (
                <tr><td colSpan="7" className="px-4 py-12 text-center" style={{ color: 'var(--text-muted)' }}>No leads found in this view.</td></tr>
              ) : (
                (view === 'pipeline' ? pipelineLeads : closedLeads).map((lead) => (
                  <tr 
                    key={lead.id} 
                    onClick={() => openEditModal(lead)}
                    className="border-b transition-colors cursor-pointer group hover:bg-white/[0.03]" 
                    style={{ borderColor: 'var(--border-default)' }}
                  >
                    <td className="px-4 py-4">
                      <div className="font-bold group-hover:text-accent transition-colors" style={{ color: 'var(--text-primary)' }}>{lead.client_name}</div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{lead.company_name}</div>
                    </td>
                    <td className="px-4 py-4">
                      {view === 'closed' ? (
                        <div style={{ color: 'var(--text-secondary)' }}>{lead.referral_name || '—'}</div>
                      ) : (
                        <>
                          <div style={{ color: 'var(--text-secondary)' }}>{lead.source || '—'}</div>
                          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{lead.medium}</div>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {view === 'closed' ? (
                        <>
                          <div style={{ color: 'var(--text-secondary)' }}>{lead.source || '—'}</div>
                          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{lead.medium}</div>
                        </>
                      ) : (
                        <div onClick={e => e.stopPropagation()}>
                          <select
                            value={lead.status}
                            onChange={(e) => handleStatusUpdate(lead.id, e.target.value)}
                            className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider outline-none border border-transparent focus:border-accent/40"
                            style={{ 
                              backgroundColor: STATUS_COLORS[lead.status]?.bg, 
                              color: STATUS_COLORS[lead.status]?.text,
                              WebkitAppearance: 'none'
                            }}
                          >
                            {STATUS_OPTIONS.map(s => <option key={s} value={s} style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>{s}</option>)}
                          </select>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {view === 'closed' ? (
                        <div className="font-bold" style={{ color: 'var(--green)' }}>{currency}{(lead.closed_amount || 0).toLocaleString('en-IN')}</div>
                      ) : (
                        <div className="font-bold" style={{ color: 'var(--text-primary)' }}>{currency}{(lead.pitched_amount || 0).toLocaleString('en-IN')}</div>
                      )}
                    </td>
                    <td className="px-4 py-4" style={{ color: 'var(--text-secondary)' }}>{lead.service_looking_for}</td>
                    <td className="px-4 py-4">
                      <div style={{ color: 'var(--text-primary)' }}>{lead.contact_email}</div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{lead.contact_phone}</div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                        <button onClick={() => openEditModal(lead)} className="p-1.5 rounded-md hover:bg-white/10 transition-colors" style={{ color: 'var(--text-muted)' }}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={(e) => handleDelete(lead.id, e)} className="p-1.5 rounded-md hover:bg-red-500/10 transition-colors" style={{ color: 'var(--red)' }}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingLead ? 'Edit Lead' : 'Add New Lead'}
        size="large"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="convert_tog" checked={form.should_convert} onChange={e => setForm({...form, should_convert: e.target.checked})} className="w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent" />
              <label htmlFor="convert_tog" className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Add to client page automatically</label>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-input text-sm font-medium border" style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-input text-sm font-semibold btn-press" style={{ backgroundColor: 'var(--accent)', color: '#000' }}>{saving ? 'Saving...' : editingLead ? 'Update Lead' : 'Save Lead'}</button>
            </div>
          </div>
        }
      >
        <div className="flex gap-2 mb-6 border-b" style={{ borderColor: 'var(--border-default)' }}>
          {['basic', 'social', 'touch', 'followup', 'status', 'docs'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === tab ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-white'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="space-y-6 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
          {activeTab === 'basic' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Lead Name *</label>
                <input value={form.client_name} onChange={e => setForm({...form, client_name: e.target.value})} className="w-full px-3 py-2 bg-[#1a1b1e] border border-white/5 rounded-md focus:border-accent/50 outline-none transition-all" />
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Company Name</label>
                <input value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} className="w-full px-3 py-2 bg-[#1a1b1e] border border-white/5 rounded-md focus:border-accent/50 outline-none transition-all" />
              </div>
              <div className="col-span-2 grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Source</label>
                  <input value={form.source} onChange={e => setForm({...form, source: e.target.value})} placeholder="e.g. Google, Referral" className="w-full px-3 py-2 bg-[#1a1b1e] border border-white/5 rounded-md focus:border-accent/50 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Medium</label>
                  <input value={form.medium} onChange={e => setForm({...form, medium: e.target.value})} placeholder="e.g. Ads, SEO" className="w-full px-3 py-2 bg-[#1a1b1e] border border-white/5 rounded-md focus:border-accent/50 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Location</label>
                  <input value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="City, Country" className="w-full px-3 py-2 bg-[#1a1b1e] border border-white/5 rounded-md focus:border-accent/50 outline-none transition-all" />
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Referral (Name of person who referred)</label>
                <input value={form.referral_name} onChange={e => setForm({...form, referral_name: e.target.value})} placeholder="Name of person..." className="w-full px-3 py-2 bg-[#1a1b1e] border border-white/5 rounded-md focus:border-accent/50 outline-none transition-all" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Service Looking For</label>
                <input value={form.service_looking_for} onChange={e => setForm({...form, service_looking_for: e.target.value})} placeholder="e.g. Web Development" className="w-full px-3 py-2 bg-[#1a1b1e] border border-white/5 rounded-md focus:border-accent/50 outline-none transition-all" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Website If Any</label>
                <input value={form.website} onChange={e => setForm({...form, website: e.target.value})} placeholder="https://..." className="w-full px-3 py-2 bg-[#1a1b1e] border border-white/5 rounded-md focus:border-accent/50 outline-none transition-all" />
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Contact Email</label>
                <input type="email" value={form.contact_email} onChange={e => setForm({...form, contact_email: e.target.value})} className="w-full px-3 py-2 bg-[#1a1b1e] border border-white/5 rounded-md focus:border-accent/50 outline-none transition-all" />
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Contact Phone</label>
                <input value={form.contact_phone} onChange={e => setForm({...form, contact_phone: e.target.value})} className="w-full px-3 py-2 bg-[#1a1b1e] border border-white/5 rounded-md focus:border-accent/50 outline-none transition-all" />
              </div>
            </div>
          )}

          {activeTab === 'social' && (
            <div className="grid grid-cols-2 gap-4">
              {['facebook', 'instagram', 'linkedin', 'youtube'].map(plat => (
                <div key={plat} className="col-span-1">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">{plat} Account</label>
                  <input value={form[`${plat}_url`]} onChange={e => setForm({...form, [`${plat}_url`]: e.target.value})} placeholder={`https://${plat}.com/...`} className="w-full px-3 py-2 bg-[#1a1b1e] border border-white/5 rounded-md focus:border-accent/50 outline-none transition-all" />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'touch' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">First Touch Date</label>
                <input type="date" value={form.first_touch_date} onChange={e => setForm({...form, first_touch_date: e.target.value})} className="w-full px-3 py-2 bg-[#1a1b1e] border border-white/5 rounded-md focus:border-accent/50 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Conversation Details</label>
                <textarea rows={4} value={form.first_touch_details} onChange={e => setForm({...form, first_touch_details: e.target.value})} className="w-full px-3 py-2 bg-[#1a1b1e] border border-white/5 rounded-md focus:border-accent/50 outline-none transition-all resize-none" placeholder="What did you talk about?" />
              </div>
            </div>
          )}

          {activeTab === 'followup' && (
            <div className="space-y-6">
              {[1, 2, 3, 4, 5].map(num => (
                <div key={num} className="p-4 rounded-md border" style={{ borderColor: 'var(--border-default)', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                  <h4 className="text-xs font-bold mb-3 uppercase tracking-wider" style={{ color: 'var(--accent)' }}>Followup {num}</h4>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-1">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-1.5">Date</label>
                      <input type="date" value={form[`followup${num}_date`]} onChange={e => setForm({...form, [`followup${num}_date`]: e.target.value})} className="w-full px-2 py-1.5 text-xs bg-[#1a1b1e] border border-white/5 rounded outline-none" />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-1.5">Conversation Note</label>
                      <input value={form[`followup${num}_details`]} onChange={e => setForm({...form, [`followup${num}_details`]: e.target.value})} placeholder="Notes about this followup..." className="w-full px-2 py-1.5 text-xs bg-[#1a1b1e] border border-white/5 rounded outline-none" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'status' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-1">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Status</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full px-3 py-2 bg-[#1a1b1e] border border-white/5 rounded-md focus:border-accent/50 outline-none transition-all">
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Pitched Amount ({currency})</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">{currency}</span>
                  <input type="number" value={form.pitched_amount} onChange={e => setForm({...form, pitched_amount: e.target.value})} className="w-full pl-7 pr-3 py-2 bg-[#1a1b1e] border border-white/5 rounded-md focus:border-accent/50 outline-none transition-all" />
                </div>
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Closed Amount ({currency})</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">{currency}</span>
                  <input type="number" value={form.closed_amount} onChange={e => setForm({...form, closed_amount: e.target.value})} className="w-full pl-7 pr-3 py-2 bg-[#1a1b1e] border border-white/5 rounded-md focus:border-accent/50 outline-none transition-all" />
                </div>
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Work Start Date</label>
                <input type="date" value={form.work_start_date} onChange={e => setForm({...form, work_start_date: e.target.value})} className="w-full px-3 py-2 bg-[#1a1b1e] border border-white/5 rounded-md focus:border-accent/50 outline-none transition-all" />
              </div>
            </div>
          )}

          {activeTab === 'docs' && (
            <div className="space-y-6">
              <div className="p-4 rounded-md border" style={{ borderColor: 'var(--border-default)', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-3">Proposal (PDF, PPT, DOC)</label>
                <div className="flex items-center gap-4">
                  <input type="file" accept=".pdf,.ppt,.pptx,.doc,.docx" onChange={e => handleFileUpload(e, 'proposal_url')} className="block w-full text-xs text-muted file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-white/5 file:text-white hover:file:bg-white/10" />
                  {form.proposal_url && (
                    <a href={`http://localhost:3001${form.proposal_url}`} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-accent hover:underline shrink-0">View Current</a>
                  )}
                </div>
              </div>
              <div className="p-4 rounded-md border" style={{ borderColor: 'var(--border-default)', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-3">Action Plan Shared (Excel)</label>
                <div className="flex items-center gap-4">
                  <input type="file" accept=".xls,.xlsx" onChange={e => handleFileUpload(e, 'action_plan_url')} className="block w-full text-xs text-muted file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-white/5 file:text-white hover:file:bg-white/10" />
                  {form.action_plan_url && (
                    <a href={`http://localhost:3001${form.action_plan_url}`} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-accent hover:underline shrink-0">View Current</a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

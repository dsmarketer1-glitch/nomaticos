import { useState, useEffect, useCallback, useRef } from 'react';
import { getClients, getTasks, createTask, updateTask, deleteTask } from '../lib/api';
import { getLocalToday } from '../lib/date';
import ClientAvatar from '../components/ClientAvatar';
import Modal from '../components/Modal';

const STATUSES = ['To Do', 'In Progress', 'Done', 'Blocked'];
const CATEGORIES = ['General', 'SEO', 'Social Media', 'Ads', 'Plan', 'Followup', 'New Client', 'SaaS'];

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_COLORS = {
  'To Do': { bg: 'rgba(148,163,184,0.15)', text: 'var(--text-secondary)', border: 'rgba(148,163,184,0.3)' },
  'In Progress': { bg: 'rgba(59,130,246,0.12)', text: 'var(--blue)', border: 'rgba(59,130,246,0.3)' },
  'Done': { bg: 'rgba(34,197,94,0.12)', text: 'var(--green)', border: 'rgba(34,197,94,0.3)' },
  'Blocked': { bg: 'rgba(239,68,68,0.12)', text: 'var(--red)', border: 'rgba(239,68,68,0.3)' },
};

export default function Tasks({ isDark }) {
  const [clients, setClients] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('table');
  const [filterClient, setFilterClient] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDate, setFilterDate] = useState(getLocalToday());
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form, setForm] = useState({ client_id: '', title: '', date: getLocalToday(), status: 'To Do', category: 'General', hours: '0' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Drag and drop state
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  // Remark popup state — mode: 'statusChange' | 'editRemark'
  const [remarkPopup, setRemarkPopup] = useState({ open: false, task: null, newStatus: '', remark: '', hours: '', mode: 'statusChange' });

  const fetchData = useCallback(async () => {
    try {
      const [c, t] = await Promise.all([getClients(), getTasks()]);
      setClients(c);
      setTasks(t);
    } catch (err) {
      setError('Could not connect to server. Make sure the backend is running on port 3001.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredTasks = tasks.filter(t => {
    if (filterClient && t.client_id !== filterClient) return false;
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterCategory && t.category !== filterCategory) return false;
    if (filterDate && t.date !== filterDate) return false;
    return true;
  });

  const hasFilters = filterClient || filterStatus || filterCategory || filterDate;

  // Open remark popup instead of changing status directly
  const handleStatusChange = (task, newStatus) => {
    if (task.status === newStatus) return;
    setRemarkPopup({ open: true, task, newStatus, remark: '', hours: task.hours || '', mode: 'statusChange' });
  };

  // Open remark popup in edit mode (clicking on existing remark)
  const openRemarkEditor = (task) => {
    setRemarkPopup({ open: true, task, newStatus: task.status, remark: task.remark || '', hours: task.hours || '', mode: 'editRemark' });
  };

  // Submit status change with optional remark
  const submitRemarkPopup = async () => {
    const { task, newStatus, remark, hours, mode } = remarkPopup;
    try {
      const updateData = { remark: remark.trim() };
      if (hours !== '') updateData.hours = parseFloat(hours) || 0;
      
      if (mode === 'editRemark') {
        await updateTask(task.id, updateData);
      } else {
        await updateTask(task.id, { ...updateData, status: newStatus, remark: remark.trim() || task.remark || '' });
      }
      fetchData();
    } catch (err) {
      console.error('Failed to update:', err);
    }
    setRemarkPopup({ open: false, task: null, newStatus: '', remark: '', hours: '', mode: 'statusChange' });
  };

  // Close remark popup — for status change mode, still change status without remark update
  const closeRemarkPopup = async () => {
    const { task, newStatus, mode } = remarkPopup;
    if (mode === 'statusChange') {
      try {
        await updateTask(task.id, { status: newStatus });
        fetchData();
      } catch (err) {
        console.error('Failed to update status:', err);
      }
    }
    setRemarkPopup({ open: false, task: null, newStatus: '', remark: '', hours: '', mode: 'statusChange' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this task?')) return;
    await deleteTask(id);
    fetchData();
  };

  const openAddModal = () => {
    setEditingTask(null);
    setForm({ client_id: clients[0]?.id || '', title: '', date: getLocalToday(), status: 'To Do', category: 'General', hours: '0' });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setForm({ client_id: task.client_id, title: task.title, date: task.date, status: task.status, category: task.category || 'General', hours: task.hours?.toString() || '0' });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.client_id) { setFormError('Please select a client'); return; }
    if (!form.title.trim()) { setFormError('Task description is required'); return; }
    setFormError('');
    setSaving(true);
    try {
      const client = clients.find(c => c.id === form.client_id);
      if (editingTask) {
        await updateTask(editingTask.id, { ...form, client_name: client?.name || '', hours: form.status === 'Done' ? parseFloat(form.hours) || 0 : editingTask.hours });
      } else {
        await createTask({
          id: generateId(),
          client_id: form.client_id,
          client_name: client?.name || '',
          title: form.title.trim(),
          date: form.date,
          status: form.status,
          category: form.category,
          source: 'manual',
          hours: form.status === 'Done' ? parseFloat(form.hours) || 0 : 0
        });
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  // ===== DRAG AND DROP HANDLERS =====
  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
    setTimeout(() => {
      e.target.style.opacity = '0.4';
    }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e, status) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (draggedTask && draggedTask.status !== targetStatus) {
      // Open remark popup for drag-drop status change too
      setRemarkPopup({ open: true, task: draggedTask, newStatus: targetStatus, remark: '' });
    }
    setDraggedTask(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="text-lg" style={{ color: 'var(--text-muted)' }}>Loading...</div>
    </div>;
  }

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5" style={{ position: 'sticky', top: 0, zIndex: 40, backgroundColor: 'var(--bg-primary)', paddingTop: '4px', paddingBottom: '12px' }}>
        <h1 className="font-head text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Tasks</h1>
        <div className="flex items-center gap-3">
          <div className="flex rounded-input border overflow-hidden" style={{ borderColor: 'var(--border-default)' }}>
            {['table', 'kanban'].map(v => (
              <button key={v} onClick={() => setView(v)}
                className="px-4 py-2 text-xs font-medium capitalize transition-colors"
                style={{
                  backgroundColor: view === v ? 'var(--accent)' : 'transparent',
                  color: view === v ? '#000' : 'var(--text-secondary)',
                }}>
                {v === 'table' ? 'Table' : 'Kanban'}
              </button>
            ))}
          </div>
          <button
            onClick={openAddModal}
            id="add-task-btn"
            className="flex-1 md:flex-none px-5 py-2.5 rounded-input text-sm font-semibold btn-press"
            style={{ backgroundColor: 'var(--accent)', color: '#000' }}
          >
            + Add Task
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)}
          className="px-3 py-2 rounded-input border text-sm min-w-[160px]"
          style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
          <option value="">All Clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-input border text-sm"
          style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="px-3 py-2 rounded-input border text-sm"
          style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
          className="px-3 py-2 rounded-input border text-sm"
          style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
        {hasFilters && (
          <button onClick={() => { setFilterClient(''); setFilterStatus(''); setFilterCategory(''); setFilterDate(''); }}
            className="px-3 py-2 rounded-input text-xs font-medium btn-press" style={{ color: 'var(--red)' }}>
            Clear Filters
          </button>
        )}
        <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
          {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
        </span>
      </div>

      {error && <div className="mb-4 px-4 py-3 rounded-input text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--red)', border: '1px solid var(--red)' }}>{error}</div>}

      {/* Empty State */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-16">
          <h2 className="font-head text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            {filterDate === getLocalToday() ? 'No tasks for today' : 'No tasks found'}
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            {hasFilters
              ? filterDate === getLocalToday()
                ? 'You have no tasks scheduled for today. Use the + Add Task button to create one.'
                : 'No tasks match your filters. Try adjusting them.'
              : 'Create your first task or generate a plan from the Clients page.'}
          </p>
          {!hasFilters && (
            <button onClick={openAddModal} className="px-5 py-2.5 rounded-input text-sm font-semibold btn-press" style={{ backgroundColor: 'var(--accent)', color: '#000' }}>
              + Add Task
            </button>
          )}
        </div>
      ) : view === 'table' ? (
        /* ===== TABLE VIEW ===== */
        <div className="table-container">
          <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-card)' }}>
                  {['Date', 'Client', 'Task', 'Category', 'Status', 'Remark', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task, idx) => (
                  <tr key={task.id} className="transition-colors hover:bg-white/[0.03]"
                    style={{ borderBottom: idx < filteredTasks.length - 1 ? '1px solid var(--border-default)' : 'none' }}>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{formatDate(task.date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ClientAvatar name={task.client_name} size={24} />
                        <span style={{ color: 'var(--text-primary)' }}>{task.client_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div style={{ color: 'var(--text-primary)' }}>{task.title}</div>
                      {task.source === 'ai' && (
                        <span className="text-[10px] font-medium mt-0.5 inline-block" style={{ color: 'var(--purple)' }}>AI generated</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-pill text-[10px] font-medium" style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: 'var(--accent)' }}>
                        {task.category}
                      </span>
                    </td>
                    {/* STATUS DROPDOWN */}
                    <td className="px-4 py-3">
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task, e.target.value)}
                        className="px-2 py-1.5 rounded-input text-xs font-semibold border-0 cursor-pointer appearance-none"
                        style={{
                          backgroundColor: STATUS_COLORS[task.status]?.bg,
                          color: STATUS_COLORS[task.status]?.text,
                          outline: 'none',
                          paddingRight: '20px',
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23888' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 6px center',
                        }}
                      >
                        {STATUSES.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    {/* REMARK COLUMN — clickable to edit */}
                    <td className="px-4 py-3" style={{ maxWidth: '200px' }}>
                      {task.remark ? (
                        <div
                          className="px-2.5 py-1.5 rounded-input text-xs cursor-pointer transition-all"
                          style={{
                            backgroundColor: 'rgba(245,158,11,0.08)',
                            color: 'var(--text-secondary)',
                            border: '1px solid rgba(245,158,11,0.15)',
                            lineHeight: '1.4',
                            wordBreak: 'break-word',
                          }}
                          title="Click to view/edit remark"
                          onClick={() => openRemarkEditor(task)}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.14)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(245,158,11,0.15)'; e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.08)'; }}
                        >
                          <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '10px', display: 'block', marginBottom: '2px' }}>💬 Remark ✎</span>
                          {task.remark.length > 60 ? task.remark.slice(0, 60) + '…' : task.remark}
                        </div>
                      ) : (
                        <button
                          className="text-[10px] px-2 py-1 rounded-input btn-press transition-colors"
                          style={{ color: 'var(--text-muted)', border: '1px dashed var(--border-default)' }}
                          onClick={() => openRemarkEditor(task)}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                        >
                          + Add remark
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditModal(task)} className="px-2 py-1 rounded text-xs btn-press" style={{ color: 'var(--text-secondary)' }}>Edit</button>
                        <button onClick={() => handleDelete(task.id)} className="px-2 py-1 rounded text-xs btn-press" style={{ color: 'var(--red)' }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ===== KANBAN VIEW WITH DRAG AND DROP ===== */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATUSES.map(status => {
            const columnTasks = filteredTasks.filter(t => t.status === status);
            const isOver = dragOverColumn === status;
            return (
              <div
                key={status}
                className="rounded-card border p-3 transition-all duration-200"
                style={{
                  backgroundColor: isOver ? 'rgba(245,158,11,0.06)' : 'var(--bg-card)',
                  borderColor: isOver ? 'var(--accent)' : 'var(--border-default)',
                  minHeight: '300px',
                  borderWidth: isOver ? '2px' : '1px',
                }}
                onDragOver={(e) => handleDragOver(e, status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, status)}
              >
                <div className="flex items-center gap-2 mb-3 px-1">
                  <h3 className="text-sm font-semibold" style={{ color: STATUS_COLORS[status]?.text }}>
                    {status}
                  </h3>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}>
                    {columnTasks.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {columnTasks.map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                      onDragEnd={handleDragEnd}
                      className="rounded-input border p-3 card-hover transition-all cursor-grab active:cursor-grabbing"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        borderColor: draggedTask?.id === task.id ? 'var(--accent)' : 'var(--border-default)',
                        opacity: draggedTask?.id === task.id ? 0.4 : 1,
                      }}
                    >
                      <div className="text-xs font-medium mb-1" style={{ color: 'var(--accent)' }}>{task.client_name}</div>
                      <div className="text-sm mb-2" style={{ color: 'var(--text-primary)' }}>{task.title}</div>
                      {task.source === 'ai' && (
                        <span className="text-[10px] font-medium mb-1 inline-block" style={{ color: 'var(--purple)' }}>AI generated</span>
                      )}
                      {/* Remark in Kanban card — clickable to edit */}
                      {task.remark ? (
                        <div
                          className="px-2 py-1.5 rounded text-[11px] mb-2 cursor-pointer transition-all"
                          style={{
                            backgroundColor: 'rgba(245,158,11,0.08)',
                            color: 'var(--text-secondary)',
                            border: '1px solid rgba(245,158,11,0.15)',
                            lineHeight: '1.4',
                            wordBreak: 'break-word',
                          }}
                          title="Click to view/edit remark"
                          onClick={(e) => { e.stopPropagation(); openRemarkEditor(task); }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.14)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(245,158,11,0.15)'; e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.08)'; }}
                        >
                          <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '9px' }}>💬 ✎ </span>
                          {task.remark.length > 50 ? task.remark.slice(0, 50) + '…' : task.remark}
                        </div>
                      ) : (
                        <button
                          className="text-[10px] px-2 py-1 rounded btn-press mb-2 transition-colors"
                          style={{ color: 'var(--text-muted)', border: '1px dashed var(--border-default)', display: 'block', width: '100%', textAlign: 'left' }}
                          onClick={(e) => { e.stopPropagation(); openRemarkEditor(task); }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                        >
                          + Add remark
                        </button>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{formatDate(task.date)}</span>
                        <div className="flex gap-1">
                          <button onClick={() => openEditModal(task)} className="text-xs px-1 btn-press" style={{ color: 'var(--text-muted)' }}>Edit</button>
                          <button onClick={() => handleDelete(task.id)} className="text-xs px-1 btn-press" style={{ color: 'var(--red)' }}>Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {columnTasks.length === 0 && (
                    <div className="text-center py-8 rounded-input border border-dashed"
                      style={{ borderColor: isOver ? 'var(--accent)' : 'var(--border-default)' }}>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {isOver ? 'Drop here' : 'No tasks'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD/EDIT TASK MODAL */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingTask ? 'Edit Task' : 'Add New Task'}
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-input text-sm font-medium border btn-press" style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-input text-sm font-semibold btn-press disabled:opacity-50" style={{ backgroundColor: 'var(--accent)', color: '#000' }}>
              {saving ? 'Saving...' : editingTask ? 'Update Task' : 'Add Task'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <div className="px-3 py-2 rounded-input text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--red)', border: '1px solid var(--red)' }}>{formError}</div>}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Client *</label>
            <select value={form.client_id} onChange={e => setForm({...form, client_id: e.target.value})}
              className="w-full px-3 py-2.5 rounded-input border text-sm"
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
              <option value="">Select a client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Task Description *</label>
            <textarea value={form.title} onChange={e => setForm({...form, title: e.target.value})} rows={3}
              className="w-full px-3 py-2.5 rounded-input border text-sm resize-none"
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
              placeholder="What needs to be done?" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Date</label>
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})}
                className="w-full px-3 py-2.5 rounded-input border text-sm"
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Category</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                className="w-full px-3 py-2.5 rounded-input border text-sm"
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Status</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}
                className="w-full px-3 py-2.5 rounded-input border text-sm"
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          
          {form.status === 'Done' && (
            <div className="animate-fadeIn">
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Hours Worked</label>
              <input type="number" step="0.5" min="0" value={form.hours} onChange={e => setForm({...form, hours: e.target.value})}
                className="w-full px-3 py-2.5 rounded-input border text-sm"
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--accent)', fontWeight: 'bold' }}
                placeholder="e.g. 1.5" />
            </div>
          )}
        </div>
      </Modal>

      {/* ===== REMARK POPUP MODAL ===== */}
      {remarkPopup.open && (
        <div
          className="fixed inset-0 z-[200] overflow-y-auto"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) closeRemarkPopup(); }}
        >
          <div className="min-h-full flex items-center justify-center p-6">
            <div
              className="w-full rounded-card border overflow-hidden"
              style={{
                maxWidth: '440px',
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-default)',
                animation: 'modalSlideIn 0.2s ease-out',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-default)' }}>
                <div>
                  <h3 className="font-head text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                    {remarkPopup.mode === 'editRemark' ? '💬 Remark' : 'Status Change'}
                  </h3>
                  {remarkPopup.mode === 'statusChange' ? (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      <span style={{ color: STATUS_COLORS[remarkPopup.task?.status]?.text, fontWeight: 600 }}>
                        {remarkPopup.task?.status}
                      </span>
                      {' → '}
                      <span style={{ color: STATUS_COLORS[remarkPopup.newStatus]?.text, fontWeight: 600 }}>
                        {remarkPopup.newStatus}
                      </span>
                    </p>
                  ) : (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      View or edit the remark for this task
                    </p>
                  )}
                </div>
                <button
                  onClick={closeRemarkPopup}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="px-5 py-4">
                <div
                  className="px-3 py-2 rounded-input mb-4 text-xs"
                  style={{
                    backgroundColor: STATUS_COLORS[remarkPopup.task?.status]?.bg,
                    color: STATUS_COLORS[remarkPopup.task?.status]?.text,
                    border: `1px solid ${STATUS_COLORS[remarkPopup.task?.status]?.border}`,
                  }}
                >
                  <strong>{remarkPopup.task?.client_name}</strong> — {remarkPopup.task?.title?.length > 60 ? remarkPopup.task.title.slice(0, 60) + '…' : remarkPopup.task?.title}
                </div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  {remarkPopup.mode === 'editRemark' ? 'Edit remark' : 'Add a remark'}
                  {remarkPopup.mode === 'statusChange' && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> (optional)</span>}
                </label>
                <textarea
                  autoFocus
                  value={remarkPopup.remark}
                  onChange={(e) => setRemarkPopup(prev => ({ ...prev, remark: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-input border text-sm resize-none"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border-default)',
                    color: 'var(--text-primary)',
                  }}
                  placeholder="e.g. Waiting on client feedback, completed ahead of schedule..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      submitRemarkPopup();
                    }
                  }}
                />
                
                {(remarkPopup.newStatus === 'Done' || remarkPopup.task?.status === 'Done') && (
                  <div className="mt-4">
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      Hours Worked
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={remarkPopup.hours}
                      onChange={(e) => setRemarkPopup(prev => ({ ...prev, hours: e.target.value }))}
                      className="w-full px-3 py-2 rounded-input border text-sm"
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        borderColor: 'var(--border-default)',
                        color: 'var(--text-primary)',
                      }}
                      placeholder="e.g. 1.5, 2"
                    />
                  </div>
                )}
                
                <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
                  Press Ctrl+Enter to submit quickly
                </p>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t flex items-center justify-end gap-2" style={{ borderColor: 'var(--border-default)' }}>
                <button
                  onClick={closeRemarkPopup}
                  className="px-4 py-2 rounded-input text-xs font-medium border btn-press"
                  style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
                >
                  {remarkPopup.mode === 'editRemark' ? 'Cancel' : 'Skip'}
                </button>
                <button
                  onClick={submitRemarkPopup}
                  className="px-5 py-2 rounded-input text-xs font-semibold btn-press"
                  style={{ backgroundColor: 'var(--accent)', color: '#000' }}
                >
                  {remarkPopup.mode === 'editRemark' ? 'Update Remark' : 'Save Remark'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

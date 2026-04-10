import { useState, useEffect, useCallback } from 'react';
import { getClients, getPayments, createPayment, updatePayment, deletePayment } from '../lib/api';
import { getLocalToday } from '../lib/date';
import ClientAvatar from '../components/ClientAvatar';
import Modal from '../components/Modal';

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function today() {
  return getLocalToday();
}

function addDays(dateStr, days) {
  const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function daysDiff(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function getPaymentStatus(payment) {
  if (payment.payment_received) return 'paid';
  
  if (payment.reminder_date) {
    const diff = daysDiff(payment.reminder_date);
    if (diff !== null && diff < 0) return 'overdue';
    if (diff !== null && diff <= 5) return 'due_soon';
  }

  if (payment.invoice_sent) return 'invoice_sent';
  return 'pending';
}

const STATUS_CONFIG = {
  paid: { label: 'Paid', bg: 'rgba(34,197,94,0.12)', text: 'var(--green)' },
  overdue: { label: 'Overdue', bg: 'rgba(239,68,68,0.12)', text: 'var(--red)' },
  due_soon: { label: 'Due Soon', bg: 'rgba(245,158,11,0.12)', text: 'var(--accent)' },
  invoice_sent: { label: 'Invoice Sent', bg: 'rgba(59,130,246,0.12)', text: 'var(--blue)' },
  pending: { label: 'Pending', bg: 'rgba(148,163,184,0.12)', text: 'var(--text-secondary)' },
};

export default function Payments() {
  const [clients, setClients] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add payment modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ client_id: '', amount: '' });
  const [addError, setAddError] = useState('');
  const [saving, setSaving] = useState(false);

  // Reminder modal
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderPayment, setReminderPayment] = useState(null);

  const currency = localStorage.getItem('nomatic_currency') || '₹';

  const fetchData = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([getClients(), getPayments()]);
      setClients(c);
      setPayments(p);
    } catch (err) {
      setError('Could not connect to server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Check for reminders that are due
  const dueReminders = payments.filter(p => {
    if (p.payment_received) return false;
    if (!p.invoice_sent || !p.reminder_date) return false;
    const diff = daysDiff(p.reminder_date);
    return diff !== null && diff <= 0;
  });

  // Auto-show reminder if there are due reminders
  useEffect(() => {
    if (dueReminders.length > 0 && !showReminderModal && !reminderPayment) {
      setReminderPayment(dueReminders[0]);
      setShowReminderModal(true);
    }
  }, [dueReminders.length]);

  // Handle Add Payment
  const handleAddPayment = async () => {
    if (!addForm.client_id) { setAddError('Please select a client'); return; }
    if (!addForm.amount || addForm.amount <= 0) { setAddError('Please enter a valid amount'); return; }
    setAddError('');
    setSaving(true);
    try {
      const client = clients.find(c => c.id === addForm.client_id);
      // Check if payment already exists for this client
      const existing = payments.find(p => p.client_id === addForm.client_id);
      if (existing) {
        setAddError('A payment record already exists for this client. Update the existing one instead.');
        setSaving(false);
        return;
      }
      await createPayment({
        id: generateId(),
        user_id: 'ds.marketer1@gmail.com', // Explicit for safety during migration
        client_id: addForm.client_id,
        client_name: client?.name || '',
        amount: parseInt(addForm.amount),
        received_date: null,
        due_date: null,
      });
      setShowAddModal(false);
      setAddForm({ client_id: '', amount: '' });
      fetchData();
    } catch (err) {
      setAddError(err.response?.data?.error || 'Failed to create payment');
    } finally {
      setSaving(false);
    }
  };

  // Handle Invoice Sent checkbox (Toggle)
  const handleInvoiceSent = async (payment) => {
    const newState = !payment.invoice_sent;
    await updatePayment(payment.id, {
      invoice_sent: newState,
      invoice_sent_date: newState ? today() : null,
      reminder_date: newState ? addDays(today(), 3) : null, // Reminder every 3 days
    });
    fetchData();
  };

  // Handle Payment Received checkbox (Toggle)
  const handlePaymentReceived = async (payment) => {
    const newState = !payment.payment_received;
    const todayDate = today();
    const invoiceDate = payment.invoice_sent_date || todayDate;
    
    await updatePayment(payment.id, {
      payment_received: newState,
      received_date: newState ? todayDate : null,
      // Next Due is 30 days from invoice sent date (Database field: due_date)
      due_date: newState ? addDays(invoiceDate, 30) : null,
      // Reminder is 3 days before next due date
      reminder_date: newState ? addDays(addDays(invoiceDate, 30), -3) : null,
      // Reset invoice sent status when paid
      invoice_sent: newState ? false : payment.invoice_sent,
    });
    fetchData();
  };

  // Handle reminder response: "Yes, I received it"
  const handleReminderYes = async () => {
    if (!reminderPayment) return;
    const todayDate = today();
    const invoiceDate = reminderPayment.invoice_sent_date || todayDate;
    await updatePayment(reminderPayment.id, {
      payment_received: true,
      received_date: todayDate,
      due_date: addDays(invoiceDate, 30),
      invoice_sent: false,
      invoice_sent_date: null,
      reminder_date: addDays(addDays(invoiceDate, 30), -3),
    });
    setShowReminderModal(false);
    setReminderPayment(null);
    fetchData();
  };

  // Handle reminder response: "No, not yet"
  const handleReminderNo = async () => {
    if (!reminderPayment) return;
    // Extend reminder by another 5 days
    await updatePayment(reminderPayment.id, {
      reminder_date: addDays(today(), 5),
    });
    setShowReminderModal(false);
    setReminderPayment(null);
    fetchData();
  };

  // Reset payment for next cycle (after marking paid)
  const handleResetCycle = async (payment) => {
    await updatePayment(payment.id, {
      payment_received: false,
      invoice_sent: false,
      invoice_sent_date: null,
      reminder_date: null,
    });
    fetchData();
  };

  const handleDeletePayment = async (id) => {
    if (!confirm('Delete this payment record?')) return;
    await deletePayment(id);
    fetchData();
  };

  // Stats
  const totalExpected = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalReceived = payments.filter(p => p.payment_received).reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalOverdue = payments.filter(p => getPaymentStatus(p) === 'overdue').length;
  const totalPending = payments.filter(p => !p.payment_received).length;

  // Clients without payment records
  const clientsWithoutPayments = clients.filter(c => !payments.find(p => p.client_id === c.id));

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="text-lg" style={{ color: 'var(--text-muted)' }}>Loading...</div>
    </div>;
  }

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="font-head text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Payments</h1>
        <button
          onClick={() => { setAddError(''); setAddForm({ client_id: '', amount: '' }); setShowAddModal(true); }}
          className="w-full md:w-auto px-5 py-2.5 rounded-input text-sm font-semibold btn-press"
          style={{ backgroundColor: 'var(--accent)', color: '#000' }}
          id="add-payment-btn"
        >
          + Add Payment Record
        </button>
      </div>

      {/* Due Reminders Banner */}
      {dueReminders.length > 0 && (
        <div className="mb-5 px-4 py-3 rounded-card border flex items-center justify-between"
          style={{ backgroundColor: 'rgba(245,158,11,0.08)', borderColor: 'var(--accent)' }}>
          <div>
            <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
              {dueReminders.length} payment reminder{dueReminders.length > 1 ? 's' : ''} due
            </span>
            <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
              — Click to review
            </span>
          </div>
          <button
            onClick={() => { setReminderPayment(dueReminders[0]); setShowReminderModal(true); }}
            className="px-3 py-1.5 rounded-input text-xs font-semibold btn-press"
            style={{ backgroundColor: 'var(--accent)', color: '#000' }}
          >
            Review
          </button>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Expected', value: `${currency}${totalExpected.toLocaleString('en-IN')}`, color: 'var(--accent)' },
          { label: 'Total Received', value: `${currency}${totalReceived.toLocaleString('en-IN')}`, color: 'var(--green)' },
          { label: 'Pending', value: totalPending, color: 'var(--blue)' },
          { label: 'Overdue', value: totalOverdue, color: 'var(--red)' },
        ].map(stat => (
          <div key={stat.label} className="rounded-card border p-5 card-hover transition-theme"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
            <div className="text-2xl font-head font-bold" style={{ color: stat.color }}>
              {stat.value}
            </div>
            <div className="text-xs mt-1 font-medium" style={{ color: 'var(--text-muted)' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {error && <div className="mb-4 px-4 py-3 rounded-input text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--red)', border: '1px solid var(--red)' }}>{error}</div>}

      {/* Payments Table */}
      {payments.length === 0 ? (
        <div className="text-center py-16">
          <h2 className="font-head text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>No payment records</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            Add a payment record for your clients to track invoices and payments.
          </p>
          <button onClick={() => setShowAddModal(true)} className="px-5 py-2.5 rounded-input text-sm font-semibold btn-press" style={{ backgroundColor: 'var(--accent)', color: '#000' }}>
            + Add Payment Record
          </button>
        </div>
      ) : (
        <div className="table-container">
          <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-card)' }}>
                  {['Client', 'Amount', 'Last Payment', 'Next Due', 'Invoice Sent', 'Payment Received', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map((payment, idx) => {
                  const status = getPaymentStatus(payment);
                  const cfg = STATUS_CONFIG[status];
                  const reminderDiff = payment.reminder_date ? daysDiff(payment.reminder_date) : null;

                  return (
                    <tr key={payment.id} className="transition-colors hover:bg-white/[0.03]"
                      style={{ borderBottom: idx < payments.length - 1 ? '1px solid var(--border-default)' : 'none' }}>
                      {/* Client */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ClientAvatar name={payment.client_name} size={28} />
                          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{payment.client_name}</span>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3">
                        <span className="font-semibold" style={{ color: 'var(--accent)' }}>
                          {currency}{payment.amount?.toLocaleString('en-IN') || 0}
                        </span>
                      </td>

                      {/* Last Payment */}
                      <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                        {formatDate(payment.received_date)}
                      </td>

                      {/* Next Due Date */}
                      <td className="px-4 py-3">
                        <span style={{
                          color: payment.due_date && daysDiff(payment.due_date) < 0 ? 'var(--red)' :
                                 payment.due_date && daysDiff(payment.due_date) <= 5 ? 'var(--accent)' :
                                 'var(--text-secondary)',
                          fontWeight: payment.due_date && daysDiff(payment.due_date) <= 5 ? '600' : '400',
                        }}>
                          {formatDate(payment.due_date)}
                          {payment.due_date && daysDiff(payment.due_date) < 0 && (
                            <span className="text-[10px] ml-1">({Math.abs(daysDiff(payment.due_date))}d late)</span>
                          )}
                        </span>
                      </td>

                      {/* Invoice Sent Checkbox */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleInvoiceSent(payment)}
                            disabled={payment.payment_received}
                            className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all duration-150 disabled:opacity-40"
                            style={{
                              borderColor: payment.invoice_sent ? 'var(--blue)' : 'var(--border-default)',
                              backgroundColor: payment.invoice_sent ? 'var(--blue)' : 'transparent',
                              cursor: payment.payment_received ? 'default' : 'pointer',
                            }}
                          >
                            {payment.invoice_sent ? <span className="text-white text-xs font-bold">✓</span> : null}
                          </button>
                          {payment.invoice_sent && payment.invoice_sent_date && (
                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                              {formatDate(payment.invoice_sent_date)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Payment Received Checkbox */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handlePaymentReceived(payment)}
                            className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all duration-150"
                            style={{
                              borderColor: payment.payment_received ? 'var(--green)' : 'var(--border-default)',
                              backgroundColor: payment.payment_received ? 'var(--green)' : 'transparent',
                              cursor: payment.payment_received ? 'default' : 'pointer',
                            }}
                          >
                            {payment.payment_received ? <span className="text-white text-xs font-bold">✓</span> : null}
                          </button>
                          {payment.payment_received && payment.received_date && (
                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                              {formatDate(payment.received_date)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-1 rounded-pill text-[11px] font-semibold"
                          style={{ backgroundColor: cfg.bg, color: cfg.text }}>
                          {cfg.label}
                        </span>
                        {reminderDiff !== null && reminderDiff <= 0 && !payment.payment_received && (
                          <div className="text-[10px] mt-1 font-medium" style={{ color: 'var(--accent)' }}>
                            Reminder due
                          </div>
                        )}
                        {reminderDiff !== null && reminderDiff > 0 && !payment.payment_received && (
                          <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                            Remind in {reminderDiff}d
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {payment.payment_received && (
                            <button onClick={() => handleResetCycle(payment)}
                              className="px-2 py-1 rounded text-xs btn-press font-medium"
                              style={{ color: 'var(--blue)' }}
                              title="Start new payment cycle">
                              New Cycle
                            </button>
                          )}
                          <button onClick={() => handleDeletePayment(payment.id)}
                            className="px-2 py-1 rounded text-xs btn-press"
                            style={{ color: 'var(--red)' }}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Clients Without Payment Records */}
      {clientsWithoutPayments.length > 0 && payments.length > 0 && (
        <div className="mt-6 rounded-card border p-5" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
            Clients without payment records ({clientsWithoutPayments.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {clientsWithoutPayments.map(c => (
              <button key={c.id}
                onClick={() => {
                  setAddForm({ client_id: c.id, amount: c.payout || '' });
                  setAddError('');
                  setShowAddModal(true);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-input border text-xs font-medium btn-press transition-colors"
                style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
                <ClientAvatar name={c.name} size={20} />
                <span>{c.name}</span>
                <span style={{ color: 'var(--accent)' }}>+ Add</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ADD PAYMENT MODAL */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Payment Record"
        footer={
          <>
            <button onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-input text-sm font-medium border btn-press" style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>Cancel</button>
            <button onClick={handleAddPayment} disabled={saving} className="px-5 py-2 rounded-input text-sm font-semibold btn-press disabled:opacity-50" style={{ backgroundColor: 'var(--accent)', color: '#000' }}>
              {saving ? 'Saving...' : 'Add Record'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {addError && <div className="px-3 py-2 rounded-input text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--red)', border: '1px solid var(--red)' }}>{addError}</div>}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Client *</label>
            <select value={addForm.client_id} onChange={e => {
              const c = clients.find(cl => cl.id === e.target.value);
              setAddForm({ client_id: e.target.value, amount: c?.payout || addForm.amount });
            }}
              className="w-full px-3 py-2.5 rounded-input border text-sm"
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
              <option value="">Select a client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.payout ? ` (${currency}${c.payout.toLocaleString('en-IN')}/mo)` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Monthly Amount ({currency}) *</label>
            <input type="number" value={addForm.amount} onChange={e => setAddForm({...addForm, amount: e.target.value})}
              className="w-full px-3 py-2.5 rounded-input border text-sm"
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
              placeholder="25000" />
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              This is auto-filled from the client's monthly payout
            </p>
          </div>
          <div className="rounded-input border p-3" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)' }}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              <strong>How it works:</strong> After adding, mark "Invoice Sent" to start tracking.
              The system will remind you in 5 days to check if payment was received.
              When payment is received, the next due date is automatically set to 30 days later.
            </p>
          </div>
        </div>
      </Modal>

      {/* PAYMENT REMINDER MODAL */}
      <Modal
        isOpen={showReminderModal}
        onClose={() => { setShowReminderModal(false); setReminderPayment(null); }}
        title="Payment Reminder"
        footer={
          <>
            <button onClick={handleReminderNo}
              className="px-5 py-2 rounded-input text-sm font-semibold btn-press border"
              style={{ borderColor: 'var(--red)', color: 'var(--red)' }}>
              No, Not Yet
            </button>
            <button onClick={handleReminderYes}
              className="px-5 py-2 rounded-input text-sm font-semibold btn-press"
              style={{ backgroundColor: 'var(--green)', color: '#fff' }}>
              Yes, Received
            </button>
          </>
        }
      >
        {reminderPayment && (
          <div className="space-y-4">
            <div className="rounded-card border p-4 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
              <ClientAvatar name={reminderPayment.client_name} size={48} />
              <h3 className="font-head text-lg font-bold mt-3" style={{ color: 'var(--text-primary)' }}>
                {reminderPayment.client_name}
              </h3>
              <div className="text-2xl font-head font-bold mt-2" style={{ color: 'var(--accent)' }}>
                {currency}{reminderPayment.amount?.toLocaleString('en-IN') || 0}
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                Invoice was sent on <strong>{formatDate(reminderPayment.invoice_sent_date)}</strong>.
              </p>
              <p className="text-base font-semibold mt-2" style={{ color: 'var(--text-primary)' }}>
                Have you received the payment?
              </p>
            </div>

            <div className="rounded-input border p-3" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                <strong>Yes:</strong> Today's date will be recorded as payment received and next due will be set to 30 days from now.
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                <strong>No:</strong> You'll be reminded again in 5 days.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

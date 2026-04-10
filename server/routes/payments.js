const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/payments — Get all payments (with optional ?client_id=)
router.get('/', (req, res) => {
  try {
    const { client_id } = req.query;
    let query = 'SELECT * FROM payments WHERE 1=1';
    const params = [];
    if (client_id) {
      query += ' AND client_id = ?';
      params.push(client_id);
    }
    query += ' ORDER BY next_due_date ASC';
    const payments = db.prepare(query).all(...params);
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments — Create a payment record
router.post('/', (req, res) => {
  try {
    const { id, client_id, client_name, amount, last_payment_date, next_due_date } = req.body;
    if (!id || !client_id) return res.status(400).json({ error: 'id and client_id are required' });

    const stmt = db.prepare(`
      INSERT INTO payments (id, client_id, client_name, amount, last_payment_date, next_due_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, client_id, client_name || '', amount || 0, last_payment_date || null, next_due_date || null);
    res.status(201).json({ id, client_id, client_name, amount, last_payment_date, next_due_date });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/payments/:id — Update payment
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Payment not found' });

    const { amount, last_payment_date, next_due_date, invoice_sent, invoice_sent_date, payment_received, reminder_date } = req.body;

    const stmt = db.prepare(`
      UPDATE payments SET
        amount = COALESCE(?, amount),
        last_payment_date = COALESCE(?, last_payment_date),
        next_due_date = COALESCE(?, next_due_date),
        invoice_sent = COALESCE(?, invoice_sent),
        invoice_sent_date = COALESCE(?, invoice_sent_date),
        payment_received = COALESCE(?, payment_received),
        reminder_date = COALESCE(?, reminder_date)
      WHERE id = ?
    `);
    stmt.run(
      amount !== undefined ? amount : null,
      last_payment_date !== undefined ? last_payment_date : null,
      next_due_date !== undefined ? next_due_date : null,
      invoice_sent !== undefined ? invoice_sent : null,
      invoice_sent_date !== undefined ? invoice_sent_date : null,
      payment_received !== undefined ? payment_received : null,
      reminder_date !== undefined ? reminder_date : null,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/payments/:id — Delete payment
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Payment not found' });
    db.prepare('DELETE FROM payments WHERE id = ?').run(req.params.id);
    res.json({ message: 'Payment deleted', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

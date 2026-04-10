const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper for safe JSON parsing
const safeParse = (str, fallback = []) => {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch (e) {
    if (typeof str === 'string' && str.includes(',')) {
      return str.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [str];
  }
};

// GET /api/clients — Get all clients
router.get('/', (req, res) => {
  try {
    const clients = db.prepare('SELECT * FROM clients ORDER BY created_at DESC').all();
    const parsed = clients.map(c => ({
      ...c,
      services: safeParse(c.services, []),
      checklist: safeParse(c.checklist, []),
    }));
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/clients/:id — Get single client
router.get('/:id', (req, res) => {
  try {
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    client.services = safeParse(client.services, []);
    client.checklist = safeParse(client.checklist, []);
    res.json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clients — Create a new client
router.post('/', (req, res) => {
  try {
    const { id, name, company, payout, payout_type, website, location, services, checklist } = req.body;
    if (!id || !name) return res.status(400).json({ error: 'id and name are required' });

    const stmt = db.prepare(`
      INSERT INTO clients (id, name, company, payout, payout_type, website, location, services, checklist)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      name,
      company || '',
      payout || 0,
      payout_type || 'Monthly',
      website || '',
      location || '',
      JSON.stringify(services || []),
      JSON.stringify(checklist || [])
    );
    res.status(201).json({ id, name, company, payout, payout_type, website, location, services, checklist });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/clients/:id — Update client
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Client not found' });

    const { name, company, payout, payout_type, website, location, services, checklist } = req.body;

    const stmt = db.prepare(`
      UPDATE clients SET
        name = COALESCE(?, name),
        company = COALESCE(?, company),
        payout = COALESCE(?, payout),
        payout_type = COALESCE(?, payout_type),
        website = COALESCE(?, website),
        location = COALESCE(?, location),
        services = COALESCE(?, services),
        checklist = COALESCE(?, checklist)
      WHERE id = ?
    `);
    stmt.run(
      name || null,
      company || null,
      payout !== undefined ? payout : null,
      payout_type || null,
      website || null,
      location || null,
      services ? JSON.stringify(services) : null,
      checklist ? JSON.stringify(checklist) : null,
      req.params.id
    );

    // Also update client_name in tasks if name changed
    if (name) {
      db.prepare('UPDATE tasks SET client_name = ? WHERE client_id = ?').run(name, req.params.id);
    }

    const updated = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    updated.services = safeParse(updated.services, []);
    updated.checklist = safeParse(updated.checklist, []);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/clients/:id — Delete client + cascade tasks
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Client not found' });

    db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
    res.json({ message: 'Client deleted', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

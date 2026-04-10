const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/tasks — Get all tasks (with optional filters)
router.get('/', (req, res) => {
  try {
    const { client_id, status, date } = req.query;
    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params = [];

    if (client_id) {
      query += ' AND client_id = ?';
      params.push(client_id);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (date) {
      query += ' AND date = ?';
      params.push(date);
    }

    query += ' ORDER BY date ASC, created_at ASC';

    const tasks = db.prepare(query).all(...params);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks — Create a single task
router.post('/', (req, res) => {
  try {
    const { id, client_id, client_name, title, date, status, category, source, remark, hours } = req.body;
    if (!id || !client_id || !title || !date) {
      return res.status(400).json({ error: 'id, client_id, title, and date are required' });
    }
    const stmt = db.prepare(`
      INSERT INTO tasks (id, client_id, client_name, title, date, status, category, source, remark, hours)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      client_id,
      client_name || '',
      title,
      date,
      status || 'To Do',
      category || 'General',
      source || 'manual',
      remark || '',
      hours || 0
    );
    res.status(201).json({ id, client_id, client_name, title, date, status, category, source, remark, hours });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks/bulk — Create multiple tasks (for AI plan)
router.post('/bulk', (req, res) => {
  try {
    const { tasks } = req.body;
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: 'tasks array is required' });
    }

    const stmt = db.prepare(`
      INSERT INTO tasks (id, client_id, client_name, title, date, status, category, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((taskList) => {
      for (const t of taskList) {
        stmt.run(
          t.id,
          t.client_id,
          t.client_name || '',
          t.title,
          t.date,
          t.status || 'To Do',
          t.category || 'General',
          t.source || 'ai'
        );
      }
    });

    insertMany(tasks);
    res.status(201).json({ message: `${tasks.length} tasks created`, count: tasks.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tasks/:id — Update task
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    const { client_id, client_name, title, date, status, category, remark, hours } = req.body || {};

    const stmt = db.prepare(`
      UPDATE tasks SET
        client_id = COALESCE(?, client_id),
        client_name = COALESCE(?, client_name),
        title = COALESCE(?, title),
        date = COALESCE(?, date),
        status = COALESCE(?, status),
        category = COALESCE(?, category),
        remark = COALESCE(?, remark),
        hours = COALESCE(?, hours)
      WHERE id = ?
    `);
    stmt.run(
      client_id || null,
      client_name || null,
      title || null,
      date || null,
      status || null,
      category || null,
      remark !== undefined ? remark : null,
      hours !== undefined ? hours : null,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tasks/:id — Delete task
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
    res.json({ message: 'Task deleted', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

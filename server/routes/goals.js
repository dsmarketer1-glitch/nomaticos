const express = require('express');
const router = express.Router();
const db = require('../db');

// Get goal for a specific month (format: YYYY-MM)
router.get('/:month_year', (req, res) => {
  try {
    const goal = db.prepare('SELECT * FROM goals WHERE month_year = ?').get(req.params.month_year);
    if (!goal) {
      return res.json({ 
        month_year: req.params.month_year, 
        revenue_target: 500000, 
        leads_target: 10,
        tasks_target: 50
      });
    }
    res.json(goal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create or update a goal
router.post('/', (req, res) => {
  const { month_year, revenue_target, leads_target, tasks_target } = req.body;
  const id = `goal_${month_year}`;

  try {
    const existing = db.prepare('SELECT id FROM goals WHERE month_year = ?').get(month_year);
    
    if (existing) {
      db.prepare(`
        UPDATE goals 
        SET revenue_target = ?, leads_target = ?, tasks_target = ?, updated_at = datetime('now')
        WHERE month_year = ?
      `).run(revenue_target, leads_target, tasks_target, month_year);
    } else {
      db.prepare(`
        INSERT INTO goals (id, month_year, revenue_target, leads_target, tasks_target)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, month_year, revenue_target, leads_target, tasks_target);
    }
    
    res.json({ message: 'Goal updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

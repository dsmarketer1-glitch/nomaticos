const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads/leads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// GET /api/leads — Get all leads
router.get('/', (req, res) => {
  try {
    const leads = db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all();
    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leads/upload — Handle file upload
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const fileUrl = `/uploads/leads/${req.file.filename}`;
    res.json({ url: fileUrl, filename: req.file.originalname });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leads — Create a single lead
router.post('/', (req, res) => {
  try {
    const { 
      id, client_name, company_name, source, medium, location, service_looking_for, website,
      facebook_url, instagram_url, linkedin_url, youtube_url, contact_email, contact_phone,
      first_touch_date, first_touch_details,
      followup1_date, followup1_details, followup2_date, followup2_details,
      followup3_date, followup3_details, followup4_date, followup4_details,
      followup5_date, followup5_details, referral_name,
      status, pitched_amount, closed_amount, proposal_url, action_plan_url, work_start_date
    } = req.body;

    const parseNum = (v) => {
      if (v === undefined || v === null || v === '') return 0;
      const parsed = parseFloat(v);
      return isNaN(parsed) ? 0 : parsed;
    };

    const stmt = db.prepare(`
      INSERT INTO leads (
        id, client_name, company_name, source, medium, location, service_looking_for, website,
        facebook_url, instagram_url, linkedin_url, youtube_url, contact_email, contact_phone,
        first_touch_date, first_touch_details,
        followup1_date, followup1_details, followup2_date, followup2_details,
        followup3_date, followup3_details, followup4_date, followup4_details,
        followup5_date, followup5_details, referral_name,
        status, pitched_amount, closed_amount, proposal_url, action_plan_url, work_start_date, closed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id, client_name, company_name || '', source || '', medium || '', location || '', service_looking_for || '', website || '',
      facebook_url || '', instagram_url || '', linkedin_url || '', youtube_url || '', contact_email || '', contact_phone || '',
      first_touch_date || '', first_touch_details || '',
      followup1_date || '', followup1_details || '', followup2_date || '', followup2_details || '',
      followup3_date || '', followup3_details || '', followup4_date || '', followup4_details || '',
      followup5_date || '', followup5_details || '', referral_name || '',
      status || 'Cold', parseNum(pitched_amount), parseNum(closed_amount), 
      proposal_url || '', action_plan_url || '', work_start_date || '',
      status === 'Closed' ? new Date().toISOString() : null
    );

    res.status(201).json({ id, client_name, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/leads/:id — Update a lead
router.put('/:id', (req, res) => {
  try {
    const { 
      client_name, company_name, source, medium, location, service_looking_for, website,
      facebook_url, instagram_url, linkedin_url, youtube_url, contact_email, contact_phone,
      first_touch_date, first_touch_details,
      followup1_date, followup1_details, followup2_date, followup2_details,
      followup3_date, followup3_details, followup4_date, followup4_details,
      followup5_date, followup5_details, referral_name,
      status, pitched_amount, closed_amount, proposal_url, action_plan_url, work_start_date, is_converted
    } = req.body;

    const stmt = db.prepare(`
      UPDATE leads SET
        client_name = COALESCE(?, client_name),
        company_name = COALESCE(?, company_name),
        source = COALESCE(?, source),
        medium = COALESCE(?, medium),
        location = COALESCE(?, location),
        service_looking_for = COALESCE(?, service_looking_for),
        website = COALESCE(?, website),
        facebook_url = COALESCE(?, facebook_url),
        instagram_url = COALESCE(?, instagram_url),
        linkedin_url = COALESCE(?, linkedin_url),
        youtube_url = COALESCE(?, youtube_url),
        contact_email = COALESCE(?, contact_email),
        contact_phone = COALESCE(?, contact_phone),
        first_touch_date = COALESCE(?, first_touch_date),
        first_touch_details = COALESCE(?, first_touch_details),
        followup1_date = COALESCE(?, followup1_date),
        followup1_details = COALESCE(?, followup1_details),
        followup2_date = COALESCE(?, followup2_date),
        followup2_details = COALESCE(?, followup2_details),
        followup3_date = COALESCE(?, followup3_date),
        followup3_details = COALESCE(?, followup3_details),
        followup4_date = COALESCE(?, followup4_date),
        followup4_details = COALESCE(?, followup4_details),
        followup5_date = COALESCE(?, followup5_date),
        followup5_details = COALESCE(?, followup5_details),
        status = COALESCE(?, status),
        pitched_amount = COALESCE(?, pitched_amount),
        closed_amount = COALESCE(?, closed_amount),
        proposal_url = COALESCE(?, proposal_url),
        action_plan_url = COALESCE(?, action_plan_url),
        work_start_date = COALESCE(?, work_start_date),
        is_converted = COALESCE(?, is_converted),
        referral_name = COALESCE(?, referral_name),
        closed_at = CASE 
          WHEN ? = 'Closed' AND (closed_at IS NULL OR closed_at = '') THEN datetime('now')
          ELSE closed_at 
        END
      WHERE id = ?
    `);

    const parseNum = (v) => {
      if (v === undefined || v === null || v === '') return null;
      const parsed = parseFloat(v);
      return isNaN(parsed) ? 0 : parsed;
    };

    stmt.run(
      client_name || null, company_name || null, source || null, medium || null, location || null, 
      service_looking_for || null, website || null, facebook_url || null, instagram_url || null, 
      linkedin_url || null, youtube_url || null, contact_email || null, contact_phone || null,
      first_touch_date || null, first_touch_details || null,
      followup1_date || null, followup1_details || null, followup2_date || null, followup2_details || null,
      followup3_date || null, followup3_details || null, followup4_date || null, followup4_details || null,
      followup5_date || null, followup5_details || null,
      status || null, 
      parseNum(pitched_amount),
      parseNum(closed_amount),
      proposal_url || null, action_plan_url || null, work_start_date || null,
      is_converted !== undefined ? is_converted : null,
      referral_name || null,
      status || null,
      req.params.id
    );

    res.json({ message: 'Lead updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/leads/:id — Delete a lead
router.delete('/:id', (req, res) => {
  try {
    const lead = db.prepare('SELECT proposal_url, action_plan_url FROM leads WHERE id = ?').get(req.params.id);
    if (lead) {
      if (lead.proposal_url) {
          const p = path.join(__dirname, '../../', lead.proposal_url);
          if (fs.existsSync(p)) fs.unlinkSync(p);
      }
      if (lead.action_plan_url) {
          const p = path.join(__dirname, '../../', lead.action_plan_url);
          if (fs.existsSync(p)) fs.unlinkSync(p);
      }
    }
    db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id);
    res.json({ message: 'Lead deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leads/:id/convert — Convert lead to client
router.post('/:id/convert', (req, res) => {
  try {
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    // 1. Create client
    const clientStmt = db.prepare(`
      INSERT INTO clients (id, name, company, website, location, services, payout, payout_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const clientId = 'c_' + Math.random().toString(36).substr(2, 9);
    
    clientStmt.run(
      clientId,
      lead.client_name,
      lead.company_name,
      lead.website,
      lead.location,
      lead.service_looking_for,
      lead.closed_amount || 0,
      'Monthly' // Default during conversion
    );

    // 2. Update lead status
    db.prepare("UPDATE leads SET status = 'Closed', is_converted = 1, closed_at = COALESCE(closed_at, datetime('now')) WHERE id = ?").run(req.params.id);

    res.json({ message: 'Lead converted to client', clientId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

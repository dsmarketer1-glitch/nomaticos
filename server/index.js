const express = require('express');
const cors = require('cors');
const path = require('path');

// Initialize database (creates tables on first run)
const db = require('./db');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
const clientsRouter = require('./routes/clients');
const tasksRouter = require('./routes/tasks');
const paymentsRouter = require('./routes/payments');
const leadsRouter = require('./routes/leads');
const goalsRouter = require('./routes/goals');

app.use('/api/clients', clientsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/goals', goalsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Nomatic OS API running on http://localhost:${PORT}`);
  console.log(`   Database: ./database/nomatic.db\n`);
});

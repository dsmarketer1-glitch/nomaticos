const Database = require('better-sqlite3');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

require('dotenv').config();
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use server-side env var
const USER_ID = 'ds.marketer1@gmail.com'; // Placeholder user_id based on email

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const db = new Database(path.resolve(__dirname, 'database/nomatic.db'));

async function migrate() {
  console.log('--- Starting Migration ---');

  const tables = ['clients', 'tasks', 'leads', 'payments', 'goals'];

  for (const table of tables) {
    try {
      console.log(`Migrating table: ${table}...`);
      const rows = db.prepare(`SELECT * FROM ${table}`).all();
      
      if (rows.length === 0) {
        console.log(`   No data found in ${table}.`);
        continue;
      }

      // Add user_id and fix JSON strings for Supabase
      const preparedRows = rows.map(row => {
        const newRow = { ...row, user_id: USER_ID };
        
        // Convert JSON strings back to objects for JSONB columns
        if (table === 'clients') {
          try { newRow.services = JSON.parse(row.services); } catch(e) {}
          try { newRow.checklist = JSON.parse(row.checklist); } catch(e) {}
        }
        
        // Remove 'id' if you want Supabase to generate it, 
        // but here we keep our custom IDs.
        
        return newRow;
      });

      const { data, error } = await supabase.from(table).upsert(preparedRows);
      
      if (error) {
        console.error(`   Error migrating ${table}:`, error.message);
      } else {
        console.log(`   Successfully migrated ${rows.length} rows to ${table}.`);
      }
    } catch (err) {
      console.error(`   Critical error during ${table} migration:`, err.message);
    }
  }

  console.log('--- Migration Complete ---');
}

migrate();

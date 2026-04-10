const db = require('./server/db');
try {
  const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='leads'").get();
  console.log(schema.sql);
} catch (err) {
  console.error(err);
}
db.close();

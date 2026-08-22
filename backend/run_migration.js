import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    const sqlPath = path.join(__dirname, 'src', 'database', 'commandCenterMigration.sql');
    let sql = fs.readFileSync(sqlPath, 'utf8');
    
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    console.log(`Executing ${statements.length} statements...`);
    
    let connection;
    if (typeof db.getConnection === 'function') {
      connection = await db.getConnection();
    } else {
      connection = db;
    }

    for (const statement of statements) {
      if (statement.toUpperCase().startsWith('DELIMITER') || statement.startsWith('--')) {
        continue;
      }
      try {
        await connection.query(statement);
        console.log('Executed successfully.');
      } catch (err) {
        console.warn(`Statement failed: ${err.message}`);
      }
    }
    
    if (typeof db.getConnection === 'function' && connection) {
      connection.release();
    }
    
    console.log('Migration complete.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

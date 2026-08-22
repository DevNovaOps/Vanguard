import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let pool = null;

/**
 * Create and return the MySQL connection pool.
 * Uses mysql2/promise for async/await support.
 * All queries MUST use prepared statements via pool.execute().
 */
export const createPool = () => {
  if (pool) return pool;

  pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'vanguard',
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    connectTimeout: 30000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    // Return DATETIME as JS Date objects
    dateStrings: false,
    // Support JSON columns
    typeCast: function (field, next) {
      if (field.type === 'JSON') {
        const val = field.string('utf8');
        if (val === null) return null;
        try {
          return JSON.parse(val);
        } catch {
          return val;
        }
      }
      return next();
    }
  });

  console.log('[VANGUARD-DB] MySQL connection pool created');
  return pool;
};

/**
 * Get the active connection pool.
 * @returns {mysql.Pool}
 */
export const getPool = () => {
  if (!pool) {
    createPool();
  }
  return pool;
};

/**
 * Execute raw SQL file against the database.
 * Used for schema creation and seed data.
 */
const executeSqlFile = async (connection, filePath) => {
  const sql = fs.readFileSync(filePath, 'utf8');
  try {
    await connection.query(sql);
  } catch (err) {
    if (err.code === 'ER_TABLE_EXISTS_ERROR' || err.code === 'ER_DB_CREATE_EXISTS' || err.code === 'ER_DUP_ENTRY') {
      return;
    }
    // Fallback statement-by-statement execution
    const statements = sql
      .split(/;\s*$/m)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      try {
        await connection.query(statement);
      } catch (innerErr) {
        if (innerErr.code === 'ER_TABLE_EXISTS_ERROR' || innerErr.code === 'ER_DB_CREATE_EXISTS' || innerErr.code === 'ER_DUP_ENTRY') {
          continue;
        }
        console.error(`[VANGUARD-DB] SQL execution error: ${innerErr.message}`);
      }
    }
  }
};

/**
 * Initialize the database: create schema, run seed SQL, then run programmatic seeds.
 * Called once at server startup.
 */
export const initializeDatabase = async () => {
  console.log('[VANGUARD-DB] ═══════════════════════════════════════════════');
  console.log('[VANGUARD-DB]   Project Vanguard — MySQL Database Connection');
  console.log(`[VANGUARD-DB]   Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(`[VANGUARD-DB]   Host        : ${process.env.MYSQL_HOST || 'localhost'}`);
  console.log(`[VANGUARD-DB]   Port        : ${process.env.MYSQL_PORT || '3306'}`);
  console.log(`[VANGUARD-DB]   Database    : ${process.env.MYSQL_DATABASE || 'vanguard'}`);
  console.log('[VANGUARD-DB] ═══════════════════════════════════════════════');

  // Step 1: Create a temporary connection without database selected to create the DB
  let tempConn;
  try {
    tempConn = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      multipleStatements: true
    });

    await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.MYSQL_DATABASE || 'vanguard'}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log('[VANGUARD-DB] ✓ Database existence verified');
  } catch (err) {
    console.error(`[VANGUARD-DB] ✗ Failed to create database: ${err.message}`);
    throw err;
  } finally {
    if (tempConn) await tempConn.end();
  }

  // Step 2: Create the connection pool
  createPool();

  // Step 3: Test the pool connection
  let conn;
  try {
    conn = await pool.getConnection();
    console.log('[VANGUARD-DB] ✓ MySQL pool connection verified');
  } catch (err) {
    console.error(`[VANGUARD-DB] ✗ MySQL pool connection failed: ${err.message}`);
    throw err;
  } finally {
    if (conn) conn.release();
  }

  // Step 4: Run schema SQL
  try {
    const schemaPath = path.resolve(__dirname, '../database/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaConn = await mysql.createConnection({
        host: process.env.MYSQL_HOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'vanguard',
        multipleStatements: true
      });
      await executeSqlFile(schemaConn, schemaPath);
      
      const migrationPath = path.resolve(__dirname, '../database/commandCenterMigration.sql');
      if (fs.existsSync(migrationPath)) {
        await executeSqlFile(schemaConn, migrationPath);
        console.log('[VANGUARD-DB] ✓ Command center migration applied');
      }

      const contextMigrationPath = path.resolve(__dirname, '../database/contextMigration.sql');
      if (fs.existsSync(contextMigrationPath)) {
        await executeSqlFile(schemaConn, contextMigrationPath);
        console.log('[VANGUARD-DB] ✓ Context switching migration applied');
      }

      await schemaConn.end();
      console.log('[VANGUARD-DB] ✓ Schema tables created/verified');
    }
  } catch (err) {
    console.error(`[VANGUARD-DB] ✗ Schema creation failed: ${err.message}`);
    throw err;
  }

  // Step 5: Run seed SQL
  try {
    const seedPath = path.resolve(__dirname, '../database/seed.sql');
    if (fs.existsSync(seedPath)) {
      const seedConn = await mysql.createConnection({
        host: process.env.MYSQL_HOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'vanguard',
        multipleStatements: true
      });
      await executeSqlFile(seedConn, seedPath);
      await seedConn.end();
      console.log('[VANGUARD-DB] ✓ Static seed data inserted');
    }
  } catch (err) {
    console.error(`[VANGUARD-DB] ⚠ Seed SQL error (non-fatal): ${err.message}`);
  }

  // Step 6: Run programmatic seed (users, nodes, connections, incidents)
  try {
    const { runProgrammaticSeed } = await import('../database/seed.js');
    await runProgrammaticSeed();
    console.log('[VANGUARD-DB] ✓ Programmatic seed complete');
  } catch (err) {
    console.error(`[VANGUARD-DB] ⚠ Programmatic seed error (non-fatal): ${err.message}`);
  }

  console.log('[VANGUARD-DB] ═══════════════════════════════════════════════');
  console.log('[VANGUARD-DB]   ✓ MySQL CONNECTED and INITIALIZED');
  console.log('[VANGUARD-DB] ═══════════════════════════════════════════════');
};

/**
 * Gracefully close the pool (for shutdown handlers).
 */
export const closePool = async () => {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[VANGUARD-DB] MySQL pool closed');
  }
};

export default { createPool, getPool, initializeDatabase, closePool };

// backend/db.js — SQLite connection
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let dbInstance = null;

async function getDb() {
  if (dbInstance) return dbInstance;
  
  dbInstance = await open({
    filename: path.join(__dirname, 'database.sqlite'),
    driver: sqlite3.Database
  });

  // Enable foreign keys
  await dbInstance.run('PRAGMA foreign_keys = ON');

  // Auto-initialize schema if needed
  try {
    const schemaFiles = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await dbInstance.exec(schemaFiles);
    console.log('✅  SQLite connected and schema initialized.');
  } catch (err) {
    console.error('❌  SQLite schema initialization failed:', err.message);
  }

  return dbInstance;
}

// Test connectivity on startup and export a promise so routes can await getDb()
getDb();

module.exports = { getDb };

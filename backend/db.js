// backend/db.js — Supabase connection setup
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables are missing.");
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getDb() {
  return supabase;
}

// Test connectivity on startup
async function testConnection() {
  try {
    const { data, error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      console.error('❌ Supabase connection or schema check failed:', error.message);
    } else {
      console.log('✅ Supabase connected successfully.');
    }
  } catch (err) {
    console.error('❌ Supabase connection failed:', err.message);
  }
}
testConnection();

module.exports = { getDb };

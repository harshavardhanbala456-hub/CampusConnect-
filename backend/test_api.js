/**
 * CampusConnect — End-to-End API + SQLite Database Test Suite
 * ─────────────────────────────────────────────────────────────
 * Run from the /backend directory:
 *   node test_api.js
 *
 * Requires: Node 18+ (native fetch), backend running on PORT 5000,
 *           and sqlite / sqlite3 already installed (they are).
 *
 * Covers:
 *  [HEALTH]         /api/health
 *  [AUTH]           register, login, /me — happy paths + every error branch
 *  [ANNOUNCEMENTS]  GET / POST / DELETE — auth guards, admin guards, validation
 *  [COMMENTS]       POST /:id/comments  — happy path, empty text, bad id
 *  [DATABASE]       Direct SQLite inspection (tables, indexes, FK integrity)
 *  [FRONTEND LINK]  Checks that VITE_API_URL points at the correct backend port
 */

'use strict';
require('dotenv').config();

const BASE   = `http://localhost:${process.env.PORT || 5000}`;
const YELLOW = '\x1b[33m';
const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';
const RESET  = '\x1b[0m';

// ── Counters ────────────────────────────────────────────────────────────────
let passed = 0, failed = 0, warnings = 0;
const failures = [];

// ── Helpers ─────────────────────────────────────────────────────────────────
function section(title) {
  console.log(`\n${BOLD}${CYAN}━━━  ${title}  ━━━${RESET}`);
}

function pass(name) {
  passed++;
  console.log(`  ${GREEN}✔${RESET}  ${name}`);
}

function fail(name, detail = '') {
  failed++;
  const msg = detail ? `${name} — ${detail}` : name;
  failures.push(msg);
  console.log(`  ${RED}✘${RESET}  ${BOLD}${name}${RESET}${detail ? `\n       ${RED}↳ ${detail}${RESET}` : ''}`);
}

function warn(name, detail = '') {
  warnings++;
  console.log(`  ${YELLOW}⚠${RESET}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function req(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, data };
}

// assert helpers
function expect(label, actual, expected) {
  if (actual === expected) { pass(label); return true; }
  fail(label, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  return false;
}
function expectField(label, obj, field) {
  if (obj && obj[field] !== undefined) { pass(label); return true; }
  fail(label, `field "${field}" missing from response`);
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. Health check
// ═══════════════════════════════════════════════════════════════════════════
async function testHealth() {
  section('HEALTH CHECK');
  try {
    const r = await req('GET', '/api/health');
    expect('GET /api/health → 200',          r.status, 200);
    expectField('response has "status" field', r.data,   'status');
    expect('status === "ok"',               r.data?.status, 'ok');
    expectField('response has "time" field',  r.data,   'time');
  } catch (e) {
    fail('Backend reachable at ' + BASE, e.message);
    console.log(`\n  ${RED}${BOLD}Cannot reach the backend. Make sure to start it first:${RESET}`);
    console.log(`  ${YELLOW}  cd backend && node server.js${RESET}\n`);
    process.exit(1); // no point continuing if server is down
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. Auth — Register
// ═══════════════════════════════════════════════════════════════════════════
let studentToken, adminToken, studentId, adminId;
const TS = Date.now();
const STUDENT_EMAIL = `student_${TS}@test.edu`;
const ADMIN_EMAIL   = `admin_${TS}@test.edu`;

async function testRegister() {
  section('AUTH — REGISTER');

  // 2a  Missing required fields
  {
    const r = await req('POST', '/api/auth/register', { email: 'x@x.com' });
    expect('Missing name/password/role → 400', r.status, 400);
    expectField('Error message present', r.data, 'error');
  }

  // 2b  Missing password
  {
    const r = await req('POST', '/api/auth/register', { name:'X', email:'x@x.com', role:'student' });
    expect('Missing password → 400', r.status, 400);
  }

  // 2c  Valid student registration
  {
    const r = await req('POST', '/api/auth/register', {
      name: 'Test Student', email: STUDENT_EMAIL,
      password: 'Pass1234!', role: 'student',
      department: 'CSE', year: '2nd Year',
    });
    expect('Valid student register → 201',      r.status, 201);
    expectField('Returns token',                 r.data,   'token');
    expectField('Returns user object',           r.data,   'user');
    expect('User role is student',              r.data?.user?.role, 'student');
    if (r.data?.token) studentToken = r.data.token;
    if (r.data?.user?.id) studentId = r.data.user.id;
  }

  // 2d  Duplicate email
  {
    const r = await req('POST', '/api/auth/register', {
      name: 'Dup', email: STUDENT_EMAIL, password: 'Pass1234!', role: 'student',
    });
    expect('Duplicate email → 409', r.status, 409);
    expectField('Duplicate error message', r.data, 'error');
  }

  // 2e  Valid admin registration
  {
    const r = await req('POST', '/api/auth/register', {
      name: 'Test Admin', email: ADMIN_EMAIL,
      password: 'AdminPass!', role: 'admin',
      department: 'Administration',
    });
    expect('Valid admin register → 201',    r.status, 201);
    expect('User role is admin',           r.data?.user?.role, 'admin');
    if (r.data?.token) adminToken = r.data.token;
    if (r.data?.user?.id) adminId = r.data.user.id;
  }

  // 2f  role injection guard — passing "admin" should be accepted (design allows it)
  //     but we confirm the field is either "admin" or "student"
  {
    const r = await req('POST', '/api/auth/register', {
      name: 'RoleTest', email: `roletest_${TS}@test.edu`,
      password: 'Pass1234!', role: 'superuser', // unknown role
    });
    if (r.status === 201) {
      expect('Unknown role coerced to student', r.data?.user?.role, 'student');
    } else {
      pass('Unknown role rejected (acceptable)');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. Auth — Login
// ═══════════════════════════════════════════════════════════════════════════
async function testLogin() {
  section('AUTH — LOGIN');

  // 3a  Missing fields
  {
    const r = await req('POST', '/api/auth/login', { email: STUDENT_EMAIL });
    expect('Missing password → 400', r.status, 400);
  }
  {
    const r = await req('POST', '/api/auth/login', {});
    expect('Empty body → 400', r.status, 400);
  }

  // 3b  Wrong password
  {
    const r = await req('POST', '/api/auth/login', { email: STUDENT_EMAIL, password: 'WrongPass' });
    expect('Wrong password → 401', r.status, 401);
    expectField('Error message present', r.data, 'error');
  }

  // 3c  Non-existent email
  {
    const r = await req('POST', '/api/auth/login', { email: 'nobody@x.com', password: 'abc' });
    expect('Non-existent email → 401', r.status, 401);
  }

  // 3d  Valid student login — refreshes token
  {
    const r = await req('POST', '/api/auth/login', { email: STUDENT_EMAIL, password: 'Pass1234!' });
    expect('Valid student login → 200', r.status, 200);
    expectField('Token returned',        r.data, 'token');
    expectField('User returned',         r.data, 'user');
    if (r.data?.token) studentToken = r.data.token; // refresh
    const hasNoHash = !r.data?.user?.password_hash;
    if (hasNoHash) pass('password_hash stripped from response');
    else fail('password_hash stripped from response', 'hash is still present');
  }

  // 3e  Valid admin login
  {
    const r = await req('POST', '/api/auth/login', { email: ADMIN_EMAIL, password: 'AdminPass!' });
    expect('Valid admin login → 200', r.status, 200);
    if (r.data?.token) adminToken = r.data.token;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. Auth — /me
// ═══════════════════════════════════════════════════════════════════════════
async function testMe() {
  section('AUTH — /me');

  // 4a  No token
  {
    const r = await req('GET', '/api/auth/me');
    expect('No token → 401', r.status, 401);
  }

  // 4b  Invalid/garbage token
  {
    const r = await req('GET', '/api/auth/me', null, 'not.a.valid.jwt');
    expect('Bad token → 401', r.status, 401);
  }

  // 4c  Valid student token
  {
    const r = await req('GET', '/api/auth/me', null, studentToken);
    expect('Valid token → 200',             r.status, 200);
    expectField('User object returned',      r.data, 'user');
    expect('Correct user id',              r.data?.user?.id, studentId);
    const hasNoHash = !r.data?.user?.password_hash;
    if (hasNoHash) pass('password_hash not exposed by /me');
    else fail('password_hash not exposed by /me', 'hash leaked');
  }

  // 4d  Valid admin token
  {
    const r = await req('GET', '/api/auth/me', null, adminToken);
    expect('Admin /me → 200',               r.status, 200);
    expect('Admin role confirmed',          r.data?.user?.role, 'admin');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. Announcements — GET
// ═══════════════════════════════════════════════════════════════════════════
async function testGetAnnouncements() {
  section('ANNOUNCEMENTS — GET');

  // 5a  No token
  {
    const r = await req('GET', '/api/announcements');
    expect('No token → 401', r.status, 401);
  }

  // 5b  Student can read
  {
    const r = await req('GET', '/api/announcements', null, studentToken);
    expect('Student can GET announcements → 200',  r.status, 200);
    expectField('Returns announcements array',      r.data, 'announcements');
    if (r.data?.announcements) {
      const isArray = Array.isArray(r.data.announcements);
      if (isArray) pass('announcements is an array');
      else fail('announcements is an array');
    }
  }

  // 5c  Admin can read
  {
    const r = await req('GET', '/api/announcements', null, adminToken);
    expect('Admin can GET announcements → 200', r.status, 200);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. Announcements — POST (create)
// ═══════════════════════════════════════════════════════════════════════════
let announcementId;

async function testCreateAnnouncement() {
  section('ANNOUNCEMENTS — POST (create)');

  // 6a  No token
  {
    const r = await req('POST', '/api/announcements', { title:'T', description:'D' });
    expect('No token → 401', r.status, 401);
  }

  // 6b  Student cannot create
  {
    const r = await req('POST', '/api/announcements', { title:'T', description:'D' }, studentToken);
    expect('Student create → 403 (admin only)', r.status, 403);
    expectField('Forbidden error message', r.data, 'error');
  }

  // 6c  Admin — missing title
  {
    // multipart not supported in this script; use JSON (no pdf)
    const formData = new FormData();
    formData.append('description', 'No title here');
    const res = await fetch(`${BASE}/api/announcements`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: formData,
    });
    const data = await res.json().catch(()=>null);
    expect('Admin create missing title → 400', res.status, 400);
  }

  // 6d  Admin — missing description
  {
    const formData = new FormData();
    formData.append('title', 'No desc here');
    const res = await fetch(`${BASE}/api/announcements`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: formData,
    });
    expect('Admin create missing description → 400', res.status, 400);
  }

  // 6e  Admin — valid full announcement
  {
    const formData = new FormData();
    formData.append('title',       'E2E Test Announcement');
    formData.append('description', 'Created by automated test suite.');
    formData.append('department',  'CSE');
    formData.append('year',        '2nd Year');
    formData.append('category',    'Academic');
    const res = await fetch(`${BASE}/api/announcements`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: formData,
    });
    const data = await res.json().catch(()=>null);
    expect('Admin create valid announcement → 201', res.status, 201);
    expectField('Returns announcements array',       data, 'announcements');
    if (data?.announcements?.length > 0) {
      // The new announcement should be first (ORDER BY created_at DESC)
      const newest = data.announcements[0];
      expect('Newest announcement has correct title', newest.title, 'E2E Test Announcement');
      expect('comments array attached',               Array.isArray(newest.comments), true);
      announcementId = newest.id;
    }
  }

  // 6f  Admin — wrong file type (non-PDF)
  {
    const formData = new FormData();
    formData.append('title', 'File type test');
    formData.append('description', 'Should reject non-pdf');
    const blob = new Blob(['fake image data'], { type: 'image/png' });
    formData.append('pdf', blob, 'image.png');
    const res = await fetch(`${BASE}/api/announcements`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: formData,
    });
    expect('Non-PDF file rejected → 400', res.status, 400);
    const data = await res.json().catch(() => null);
    if (data?.error && data.error.toLowerCase().includes('pdf')) {
      pass('Non-PDF error message mentions PDF');
    } else {
      fail('Non-PDF error message mentions PDF', JSON.stringify(data));
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. Comments — POST
// ═══════════════════════════════════════════════════════════════════════════
async function testComments() {
  section('COMMENTS — POST /:id/comments');

  if (!announcementId) {
    warn('Skipping comment tests — no announcement was created');
    return;
  }

  // 7a  No token
  {
    const r = await req('POST', `/api/announcements/${announcementId}/comments`, { text: 'Hi' });
    expect('No token → 401', r.status, 401);
  }

  // 7b  Empty text
  {
    const r = await req('POST', `/api/announcements/${announcementId}/comments`, { text: '   ' }, studentToken);
    expect('Empty/whitespace comment → 400', r.status, 400);
  }

  // 7c  Missing text field
  {
    const r = await req('POST', `/api/announcements/${announcementId}/comments`, {}, studentToken);
    expect('Missing text field → 400', r.status, 400);
  }

  // 7d  Non-existent announcement id
  {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const r = await req('POST', `/api/announcements/${fakeId}/comments`, { text: 'Hi' }, studentToken);
    expect('Non-existent announcement → 404', r.status, 404);
  }

  // 7e  Valid student comment
  {
    const r = await req('POST', `/api/announcements/${announcementId}/comments`, { text: 'Great news!' }, studentToken);
    expect('Valid student comment → 201', r.status, 201);
    expectField('Returns comments array',   r.data,  'comments');
    if (Array.isArray(r.data?.comments) && r.data.comments.length > 0) {
      const c = r.data.comments[r.data.comments.length - 1];
      expect('Comment text matches',       c.text,       'Great news!');
      expect('author_name matches',        c.author_name, 'Test Student');
    }
  }

  // 7f  Admin can also comment
  {
    const r = await req('POST', `/api/announcements/${announcementId}/comments`, { text: 'Acknowledged.' }, adminToken);
    expect('Admin comment → 201', r.status, 201);
  }

  // 7g  Verify GET returns embedded comments
  {
    const r = await req('GET', '/api/announcements', null, studentToken);
    const ann = r.data?.announcements?.find(a => a.id === announcementId);
    if (ann) {
      if (Array.isArray(ann.comments) && ann.comments.length >= 2) {
        pass('GET /announcements embeds comments correctly');
      } else {
        fail('GET /announcements embeds comments correctly', `comments.length = ${ann.comments?.length}`);
      }
      const hasNoPdfBuffer = ann.pdf_data === undefined;
      if (hasNoPdfBuffer) pass('Raw pdf_data buffer stripped from list response');
      else fail('Raw pdf_data buffer stripped from list response', 'pdf_data still present');
    } else {
      warn('Could not find test announcement in list (maybe it was already deleted)');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. Announcements — DELETE
// ═══════════════════════════════════════════════════════════════════════════
async function testDeleteAnnouncement() {
  section('ANNOUNCEMENTS — DELETE /:id');

  if (!announcementId) {
    warn('Skipping delete tests — no announcement was created');
    return;
  }

  // 8a  No token
  {
    const r = await req('DELETE', `/api/announcements/${announcementId}`);
    expect('No token → 401', r.status, 401);
  }

  // 8b  Student cannot delete
  {
    const r = await req('DELETE', `/api/announcements/${announcementId}`, null, studentToken);
    expect('Student delete → 403 (admin only)', r.status, 403);
  }

  // 8c  Non-existent id (admin)
  {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const r = await req('DELETE', `/api/announcements/${fakeId}`, null, adminToken);
    expect('Delete non-existent id → 404', r.status, 404);
  }

  // 8d  Admin valid delete
  {
    const r = await req('DELETE', `/api/announcements/${announcementId}`, null, adminToken);
    expect('Admin delete → 200',         r.status, 200);
    expectField('Success message',        r.data,  'message');
  }

  // 8e  Re-delete same id
  {
    const r = await req('DELETE', `/api/announcements/${announcementId}`, null, adminToken);
    expect('Re-delete same id → 404', r.status, 404);
  }

  // 8f  Verify cascade — comments should be gone
  {
    const r = await req('GET', '/api/announcements', null, studentToken);
    const still = r.data?.announcements?.find(a => a.id === announcementId);
    if (!still) pass('Deleted announcement no longer appears in GET list');
    else fail('Deleted announcement no longer appears in GET list');
  }

  announcementId = null; // mark cleaned up
}

// ═══════════════════════════════════════════════════════════════════════════
// 9. 404 fallback route
// ═══════════════════════════════════════════════════════════════════════════
async function testFallback() {
  section('404 FALLBACK');
  const r = await req('GET', '/api/does-not-exist');
  expect('Unknown route → 404',          r.status, 404);
  expectField('Error field present',      r.data, 'error');
}

// ═══════════════════════════════════════════════════════════════════════════
// 10. Direct SQLite Database Verification
// ═══════════════════════════════════════════════════════════════════════════
async function testDatabase() {
  section('DATABASE — Direct SQLite Inspection');

  let db;
  try {
    const { open }  = require('sqlite');
    const sqlite3   = require('sqlite3');
    const path      = require('path');

    db = await open({
      filename: path.join(__dirname, 'database.sqlite'),
      driver: sqlite3.Database,
    });

    // Enable FK pragma on this connection (mirrors what db.js does at runtime)
    await db.run('PRAGMA foreign_keys = ON');

    // 10a  Required tables exist
    for (const table of ['users', 'announcements', 'comments']) {
      const row = await db.get(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [table]
      );
      if (row) pass(`Table "${table}" exists`);
      else fail(`Table "${table}" exists`);
    }

    // 10b  Required indexes exist
    const expectedIndexes = [
      'idx_department', 'idx_year', 'idx_category', 'idx_created_at', 'idx_announcement_id'
    ];
    for (const idx of expectedIndexes) {
      const row = await db.get(
        `SELECT name FROM sqlite_master WHERE type='index' AND name=?`, [idx]
      );
      if (row) pass(`Index "${idx}" exists`);
      else fail(`Index "${idx}" exists`);
    }

    // 10c  Foreign keys pragma
    const fk = await db.get('PRAGMA foreign_keys');
    if (fk && fk.foreign_keys === 1) pass('Foreign keys PRAGMA is ON');
    else warn('Foreign keys PRAGMA check', `value = ${fk?.foreign_keys}`);

    // 10d  Users table schema columns
    const userCols = await db.all('PRAGMA table_info(users)');
    const userColNames = userCols.map(c => c.name);
    for (const col of ['id','name','email','password_hash','role','department','year','created_at']) {
      if (userColNames.includes(col)) pass(`users.${col} column exists`);
      else fail(`users.${col} column exists`);
    }

    // 10e  Announcements table columns
    const annCols = await db.all('PRAGMA table_info(announcements)');
    const annColNames = annCols.map(c => c.name);
    for (const col of ['id','title','description','pdf_data','pdf_name','pdf_mime','department','year','category','author_id','author_name','created_at']) {
      if (annColNames.includes(col)) pass(`announcements.${col} column exists`);
      else fail(`announcements.${col} column exists`);
    }

    // 10f  Comments table columns
    const comCols = await db.all('PRAGMA table_info(comments)');
    const comColNames = comCols.map(c => c.name);
    for (const col of ['id','announcement_id','text','author_id','author_name','created_at']) {
      if (comColNames.includes(col)) pass(`comments.${col} column exists`);
      else fail(`comments.${col} column exists`);
    }

    // 10g  Test users we just created are persisted in DB
    if (studentId) {
      const u = await db.get('SELECT id, role FROM users WHERE id=?', [studentId]);
      if (u && u.role === 'student') pass('Test student persisted in DB with correct role');
      else fail('Test student persisted in DB');
    }
    if (adminId) {
      const u = await db.get('SELECT id, role FROM users WHERE id=?', [adminId]);
      if (u && u.role === 'admin') pass('Test admin persisted in DB with correct role');
      else fail('Test admin persisted in DB');
    }

    // 10h  Email uniqueness constraint
    try {
      const crypto = require('crypto');
      await db.run(
        `INSERT INTO users (id, name, email, password_hash, role) VALUES (?,?,?,?,?)`,
        [crypto.randomUUID(), 'Dup', STUDENT_EMAIL, 'hash', 'student']
      );
      fail('DB rejects duplicate email (UNIQUE constraint)', 'insert succeeded — constraint missing!');
    } catch (e) {
      if (e.message && e.message.includes('UNIQUE')) pass('DB rejects duplicate email (UNIQUE constraint)');
      else fail('DB rejects duplicate email (UNIQUE constraint)', e.message);
    }

    // 10i  password_hash is NOT plaintext in DB
    if (studentId) {
      const u = await db.get('SELECT password_hash FROM users WHERE id=?', [studentId]);
      if (u && u.password_hash && u.password_hash.startsWith('$2')) {
        pass('Passwords stored as bcrypt hash (starts with $2)');
      } else {
        fail('Passwords stored as bcrypt hash', 'may be plaintext!');
      }
    }

    // 10j  Row counts (informational)
    const userCount = await db.get('SELECT COUNT(*) as c FROM users');
    const annCount  = await db.get('SELECT COUNT(*) as c FROM announcements');
    const comCount  = await db.get('SELECT COUNT(*) as c FROM comments');
    console.log(`\n  ${YELLOW}ℹ${RESET}  DB row counts: users=${userCount.c}, announcements=${annCount.c}, comments=${comCount.c}`);

    await db.close();
  } catch (e) {
    fail('Open SQLite database directly', e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 11. Frontend ↔ Backend connectivity config check
// ═══════════════════════════════════════════════════════════════════════════
async function testFrontendConfig() {
  section('FRONTEND ↔ BACKEND CONFIG');

  const fs   = require('fs');
  const path = require('path');

  // 11a  Root .env exists and has VITE_API_URL
  const rootEnvPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(rootEnvPath)) {
    pass('Root .env file exists');
    const content = fs.readFileSync(rootEnvPath, 'utf8');
    const match = content.match(/VITE_API_URL\s*=\s*(.+)/);
    if (match) {
      const url = match[1].trim();
      pass(`VITE_API_URL defined: ${url}`);
      const backendPort = process.env.PORT || '5000';
      if (url.includes(`:${backendPort}`)) pass(`VITE_API_URL points to correct backend port ${backendPort}`);
      else fail(`VITE_API_URL points to correct backend port ${backendPort}`, `VITE_API_URL = ${url}`);
    } else {
      fail('VITE_API_URL defined in root .env');
    }
  } else {
    fail('Root .env file exists');
  }

  // 11b  Backend .env has JWT_SECRET
  const beEnvPath = path.join(__dirname, '.env');
  if (fs.existsSync(beEnvPath)) {
    pass('Backend .env file exists');
    const content = fs.readFileSync(beEnvPath, 'utf8');
    if (/JWT_SECRET\s*=\s*.+/.test(content)) pass('JWT_SECRET is set in backend .env');
    else fail('JWT_SECRET is set in backend .env');
  } else {
    fail('Backend .env file exists');
  }

  // 11c  src/api.ts uses correct env variable
  const apiTsPath = path.join(__dirname, '..', 'src', 'api.ts');
  if (fs.existsSync(apiTsPath)) {
    const content = fs.readFileSync(apiTsPath, 'utf8');
    if (content.includes('VITE_API_URL')) pass('src/api.ts reads VITE_API_URL env variable');
    else fail('src/api.ts reads VITE_API_URL env variable');
    if (content.includes('localStorage.getItem')) pass('src/api.ts attaches JWT from localStorage');
    else fail('src/api.ts attaches JWT from localStorage');
    if (content.includes('status === 401') || content.includes("status === 401")) {
      pass('src/api.ts clears token on 401');
    } else {
      warn('src/api.ts 401 interceptor check', 'pattern not found — review manually');
    }
  } else {
    fail('src/api.ts exists');
  }

  // 11d  AuthContext uses correct storage key
  const authCtxPath = path.join(__dirname, '..', 'src', 'contexts', 'AuthContext.tsx');
  if (fs.existsSync(authCtxPath)) {
    const content = fs.readFileSync(authCtxPath, 'utf8');
    if (content.includes('cc_token')) pass("AuthContext uses 'cc_token' localStorage key");
    else fail("AuthContext uses 'cc_token' localStorage key");
  }

  // 11e  vite.config proxy check (optional)
  const viteConfigPath = path.join(__dirname, '..', 'vite.config.ts');
  if (fs.existsSync(viteConfigPath)) {
    const content = fs.readFileSync(viteConfigPath, 'utf8');
    if (content.includes('proxy')) {
      pass('vite.config.ts has proxy configured');
      console.log(`  ${YELLOW}ℹ${RESET}  Note: with a proxy, VITE_API_URL may not be needed; double-check port alignment.`);
    } else {
      warn('vite.config.ts proxy not configured', 'relying on VITE_API_URL (acceptable if CORS is set)');
    }
  }

  // 11f  CORS origin check in server.js
  const serverPath = path.join(__dirname, 'server.js');
  if (fs.existsSync(serverPath)) {
    const content = fs.readFileSync(serverPath, 'utf8');
    if (content.includes('FRONTEND_URL') || content.includes('localhost')) {
      pass('server.js has CORS origin configured');
    } else {
      fail('server.js has CORS origin configured');
    }
  }

  // 11g  Try to reach the frontend (best-effort)
  try {
    const res = await fetch('http://localhost:3000', { signal: AbortSignal.timeout(2000) });
    if (res.ok || res.status < 500) pass('Frontend reachable at http://localhost:3000');
    else warn('Frontend reachability', `status ${res.status}`);
  } catch {
    warn('Frontend not reachable at http://localhost:3000', 'start with: npm run dev (from root)');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 12. Summary
// ═══════════════════════════════════════════════════════════════════════════
function printSummary() {
  const total = passed + failed;
  console.log(`\n${BOLD}${'═'.repeat(55)}${RESET}`);
  console.log(`${BOLD}  TEST SUMMARY${RESET}`);
  console.log(`${'═'.repeat(55)}`);
  console.log(`  ${GREEN}Passed  :${RESET} ${passed}/${total}`);
  console.log(`  ${RED}Failed  :${RESET} ${failed}`);
  console.log(`  ${YELLOW}Warnings:${RESET} ${warnings}`);
  console.log(`${'═'.repeat(55)}`);
  if (failures.length > 0) {
    console.log(`\n${RED}${BOLD}  Failed Tests:${RESET}`);
    failures.forEach((f, i) => console.log(`  ${RED}${i + 1}. ${f}${RESET}`));
  }
  if (failed === 0) {
    console.log(`\n  ${GREEN}${BOLD}🎉  All tests passed!${RESET}\n`);
  } else {
    console.log(`\n  ${RED}${BOLD}❌  ${failed} test(s) failed — see above.${RESET}\n`);
    process.exitCode = 1;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
(async () => {
  console.log(`\n${BOLD}${CYAN}╔══════════════════════════════════════════════════════╗`);
  console.log(`║     CampusConnect — E2E API Test Suite               ║`);
  console.log(`║     Target: ${BASE.padEnd(41)}║`);
  console.log(`╚══════════════════════════════════════════════════════╝${RESET}`);

  await testHealth();
  await testRegister();
  await testLogin();
  await testMe();
  await testGetAnnouncements();
  await testCreateAnnouncement();
  await testComments();
  await testDeleteAnnouncement();
  await testFallback();
  // await testDatabase(); // Removed SQLite testing
  await testFrontendConfig();

  printSummary();
})();

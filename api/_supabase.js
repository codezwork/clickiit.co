// api/_supabase.js - shared Supabase client (used by Vercel serverless functions)
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gqcynoumwixuriguwtjz.supabase.co';
// Use Service Key if set in Vercel env vars, otherwise default to Anon Key provided
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxY3lub3Vtd2l4dXJpZ3V3dGp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0Nzg0NDQsImV4cCI6MjEwNTA1NDQ0NH0.qaBMHFcIa20s2AM8RevFFXmvBEU44NFf_YeYgwdnRiY';

let _client = null;
function getSupabase() {
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  }
  return _client;
}

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'clickit@admin2026';
const ADMIN_TOKEN = 'clickit_session_' + Buffer.from(ADMIN_PASSWORD).toString('base64');

function isAuthorized(req) {
  const auth = (req.headers && (req.headers['authorization'] || req.headers['Authorization'])) || '';
  return auth === 'Bearer ' + ADMIN_TOKEN || auth === ADMIN_TOKEN;
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = { getSupabase, isAuthorized, cors, ADMIN_TOKEN, SUPABASE_URL, SUPABASE_KEY };

const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('Missing required Supabase environment variables (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)');
}

// Admin client - uses the service role key, bypasses RLS entirely.
// Only ever used inside trusted server-side controllers, never exposed to clients.
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: { fetch }
});

// Plain anon client - used for signup / login / password-reset calls that
// must go through Supabase Auth's public endpoints.
const supabaseAnon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: { fetch }
});

// Returns a client scoped to the requesting user's JWT so Postgres RLS
// policies apply exactly as they would for a direct client connection.
function getUserClient(accessToken) {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` }, fetch },
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

module.exports = { supabaseAdmin, supabaseAnon, getUserClient };

const { supabaseAdmin, getUserClient } = require('../config/supabase');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: 'Missing access token' });

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ success: false, message: 'Invalid or expired token' });

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) return res.status(404).json({ success: false, message: 'User profile not found' });
    if (profile.is_banned) return res.status(403).json({ success: false, message: 'This account has been banned' });

    req.token = token;
    req.authUser = data.user;
    req.profile = profile;
    req.supabase = getUserClient(token); // RLS-scoped client, available if a controller wants to query as the user
    next();
  } catch (err) {
    next(err);
  }
}

// Same as requireAuth but does not fail the request if there is no token.
// Used on public endpoints (e.g. brush detail, search) that personalize
// behavior slightly when a logged-in user is present.
async function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();

  try {
    const { data } = await supabaseAdmin.auth.getUser(token);
    if (data?.user) {
      const { data: profile } = await supabaseAdmin.from('users').select('*').eq('id', data.user.id).single();
      req.token = token;
      req.authUser = data.user;
      req.profile = profile || null;
      req.supabase = getUserClient(token);
    }
  } catch (_) {
    // ignore - request proceeds unauthenticated
  }
  next();
}

module.exports = { requireAuth, optionalAuth };

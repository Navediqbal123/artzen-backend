const { supabaseAdmin } = require('../config/supabase');

// Must run after requireAuth - relies on req.profile
async function requireAdmin(req, res, next) {
  try {
    if (!req.profile) return res.status(401).json({ success: false, message: 'Authentication required' });

    const { data, error } = await supabaseAdmin
      .from('admin_users')
      .select('role')
      .eq('user_id', req.profile.id)
      .maybeSingle();

    if (error) return next(error);
    if (!data) return res.status(403).json({ success: false, message: 'Admin access required' });

    req.adminRole = data.role; // 'admin' | 'superadmin'
    next();
  } catch (err) {
    next(err);
  }
}

function requireSuperAdmin(req, res, next) {
  if (req.adminRole !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Superadmin access required' });
  }
  next();
}

module.exports = { requireAdmin, requireSuperAdmin };

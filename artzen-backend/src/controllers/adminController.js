const { supabaseAdmin } = require('../config/supabase');
const { ok, fail } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

const dashboard = asyncHandler(async (req, res) => {
  const [usersRes, brushesRes, downloadsRes, favoritesRes, categoriesRes] = await Promise.all([
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('brushes').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('downloads').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('favorites').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('categories').select('*', { count: 'exact', head: true })
  ]);

  const { data: mostDownloaded } = await supabaseAdmin
    .from('brushes')
    .select('id, name, downloads_count, preview_image_url')
    .order('downloads_count', { ascending: false })
    .limit(10);

  const { data: mostFavorited } = await supabaseAdmin
    .from('brushes')
    .select('id, name, favorites_count, preview_image_url')
    .order('favorites_count', { ascending: false })
    .limit(10);

  return ok(
    res,
    {
      total_users: usersRes.count,
      total_brushes: brushesRes.count,
      total_downloads: downloadsRes.count,
      total_favorites: favoritesRes.count,
      total_categories: categoriesRes.count,
      most_downloaded_brushes: mostDownloaded,
      most_favorited_brushes: mostFavorited
    },
    'Dashboard stats fetched'
  );
});

const listUsers = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = (page - 1) * limit;
  const { search, banned } = req.query;

  let query = supabaseAdmin.from('users').select('*', { count: 'exact' });
  if (search) query = query.ilike('username', `%${search}%`);
  if (banned === 'true') query = query.eq('is_banned', true);
  if (banned === 'false') query = query.eq('is_banned', false);
  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return fail(res, error.message, 400);

  return ok(res, { users: data, page, limit, total: count }, 'Users fetched');
});

const banUser = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ is_banned: true, banned_reason: reason || null })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return fail(res, error.message, 400);

  return ok(res, data, 'User banned');
});

const unbanUser = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ is_banned: false, banned_reason: null })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return fail(res, error.message, 400);

  return ok(res, data, 'User unbanned');
});

const deleteUser = asyncHandler(async (req, res) => {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(req.params.id);
  if (error) return fail(res, error.message, 400);
  return ok(res, null, 'User deleted');
});

const listAllBrushes = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabaseAdmin
    .from('brushes')
    .select('*, categories(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) return fail(res, error.message, 400);

  return ok(res, { brushes: data, page, limit, total: count }, 'All brushes fetched');
});

const grantAdmin = asyncHandler(async (req, res) => {
  const { user_id, role } = req.body;
  if (!user_id) return fail(res, 'user_id is required', 422);

  const { data, error } = await supabaseAdmin
    .from('admin_users')
    .upsert(
      { user_id, role: role === 'superadmin' ? 'superadmin' : 'admin', granted_by: req.profile.id },
      { onConflict: 'user_id' }
    )
    .select()
    .single();
  if (error) return fail(res, error.message, 400);

  return ok(res, data, 'Admin role granted');
});

const revokeAdmin = asyncHandler(async (req, res) => {
  const { error } = await supabaseAdmin.from('admin_users').delete().eq('user_id', req.params.id);
  if (error) return fail(res, error.message, 400);
  return ok(res, null, 'Admin role revoked');
});

const analyticsOverview = asyncHandler(async (req, res) => {
  const { event_type, days } = req.query;
  const since = new Date(Date.now() - (parseInt(days) || 30) * 24 * 60 * 60 * 1000).toISOString();

  let query = supabaseAdmin.from('analytics').select('*').gte('created_at', since).order('created_at', { ascending: false }).limit(500);
  if (event_type) query = query.eq('event_type', event_type);

  const { data, error } = await query;
  if (error) return fail(res, error.message, 400);

  return ok(res, data, 'Analytics fetched');
});

module.exports = {
  dashboard,
  listUsers,
  banUser,
  unbanUser,
  deleteUser,
  listAllBrushes,
  grantAdmin,
  revokeAdmin,
  analyticsOverview
};

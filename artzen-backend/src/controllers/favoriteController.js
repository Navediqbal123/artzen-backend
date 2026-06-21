const { supabaseAdmin } = require('../config/supabase');
const { ok, fail } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

// Note: brushes.favorites_count stays in sync automatically via the
// trg_favorites_count DB trigger (sql/002_functions_triggers.sql) -
// no manual increment/decrement needed here.

const addFavorite = asyncHandler(async (req, res) => {
  const { brush_id } = req.body;
  if (!brush_id) return fail(res, 'brush_id is required', 422);

  const { data: brush } = await supabaseAdmin.from('brushes').select('id').eq('id', brush_id).single();
  if (!brush) return fail(res, 'Brush not found', 404);

  const { data: existing } = await supabaseAdmin
    .from('favorites')
    .select('id')
    .eq('user_id', req.profile.id)
    .eq('brush_id', brush_id)
    .maybeSingle();
  if (existing) return fail(res, 'Already favorited', 409);

  const { data, error } = await supabaseAdmin
    .from('favorites')
    .insert({ user_id: req.profile.id, brush_id })
    .select()
    .single();
  if (error) return fail(res, error.message, 400);

  await supabaseAdmin.from('analytics').insert({ event_type: 'favorite', user_id: req.profile.id, brush_id });

  return ok(res, data, 'Added to favorites', 201);
});

const removeFavorite = asyncHandler(async (req, res) => {
  const { brush_id } = req.params;

  const { data: existing } = await supabaseAdmin
    .from('favorites')
    .select('id')
    .eq('user_id', req.profile.id)
    .eq('brush_id', brush_id)
    .maybeSingle();
  if (!existing) return fail(res, 'Favorite not found', 404);

  const { error } = await supabaseAdmin.from('favorites').delete().eq('user_id', req.profile.id).eq('brush_id', brush_id);
  if (error) return fail(res, error.message, 400);

  await supabaseAdmin.from('analytics').insert({ event_type: 'unfavorite', user_id: req.profile.id, brush_id });

  return ok(res, null, 'Removed from favorites');
});

const myFavorites = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabaseAdmin
    .from('favorites')
    .select('id, created_at, brushes(*)', { count: 'exact' })
    .eq('user_id', req.profile.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) return fail(res, error.message, 400);

  return ok(res, { favorites: data, page, limit, total: count }, 'Favorites fetched');
});

module.exports = { addFavorite, removeFavorite, myFavorites };

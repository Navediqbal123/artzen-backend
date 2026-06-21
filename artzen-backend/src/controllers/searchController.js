const { supabaseAdmin } = require('../config/supabase');
const { ok, fail } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

const searchBrushes = asyncHandler(async (req, res) => {
  const { q, category_id } = req.query;
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = (page - 1) * limit;

  let query = supabaseAdmin.from('brushes').select('*', { count: 'exact' }).eq('is_active', true);
  if (q) query = query.ilike('name', `%${q}%`);
  if (category_id) query = query.eq('category_id', category_id);
  query = query.order('downloads_count', { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return fail(res, error.message, 400);

  if (q && req.profile) {
    await supabaseAdmin.from('analytics').insert({
      event_type: 'search',
      user_id: req.profile.id,
      metadata: { query: q, category_id: category_id || null }
    });
  }

  return ok(res, { brushes: data, page, limit, total: count, total_pages: Math.ceil(count / limit) }, 'Search results');
});

module.exports = { searchBrushes };

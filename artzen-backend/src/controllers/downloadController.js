const { supabaseAdmin } = require('../config/supabase');
const { ok, fail } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

// brushes.downloads_count stays in sync automatically via the
// trg_downloads_count DB trigger (sql/002_functions_triggers.sql).

const recordDownload = asyncHandler(async (req, res) => {
  const { brush_id } = req.body;
  if (!brush_id) return fail(res, 'brush_id is required', 422);

  const { data: brush } = await supabaseAdmin
    .from('brushes')
    .select('id, file_url, is_premium')
    .eq('id', brush_id)
    .eq('is_active', true)
    .single();
  if (!brush) return fail(res, 'Brush not found', 404);

  const { data, error } = await supabaseAdmin
    .from('downloads')
    .insert({ user_id: req.profile.id, brush_id })
    .select()
    .single();
  if (error) return fail(res, error.message, 400);

  await supabaseAdmin.from('analytics').insert({ event_type: 'download', user_id: req.profile.id, brush_id });

  return ok(res, { download: data, file_url: brush.file_url }, 'Download recorded', 201);
});

const myDownloadHistory = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabaseAdmin
    .from('downloads')
    .select('id, downloaded_at, brushes(*)', { count: 'exact' })
    .eq('user_id', req.profile.id)
    .order('downloaded_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) return fail(res, error.message, 400);

  return ok(res, { downloads: data, page, limit, total: count }, 'Download history fetched');
});

module.exports = { recordDownload, myDownloadHistory };

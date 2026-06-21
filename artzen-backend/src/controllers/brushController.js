const crypto = require('crypto');
const { supabaseAdmin } = require('../config/supabase');
const { removeFolder } = require('../utils/storage');
const { ok, fail } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

function parseTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  return tags.split(',').map((t) => t.trim()).filter(Boolean);
}

const listBrushes = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = (page - 1) * limit;
  const { category_id, sort } = req.query;

  let query = supabaseAdmin.from('brushes').select('*', { count: 'exact' }).eq('is_active', true);
  if (category_id) query = query.eq('category_id', category_id);

  if (sort === 'popular') query = query.order('downloads_count', { ascending: false });
  else if (sort === 'favorited') query = query.order('favorites_count', { ascending: false });
  else query = query.order('created_at', { ascending: false });

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return fail(res, error.message, 400);

  return ok(res, { brushes: data, page, limit, total: count, total_pages: Math.ceil(count / limit) }, 'Brushes fetched');
});

const getBrush = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('brushes')
    .select('*, categories(id, name, slug)')
    .eq('id', req.params.id)
    .eq('is_active', true)
    .single();
  if (error) return fail(res, 'Brush not found', 404);

  await supabaseAdmin.from('analytics').insert({
    event_type: 'brush_view',
    user_id: req.profile?.id || null,
    brush_id: data.id
  });

  return ok(res, data, 'Brush fetched');
});

const createBrush = asyncHandler(async (req, res) => {
  const { name, description, category_id, is_premium, default_size, default_opacity, default_flow, tags } = req.body;
  if (!name) return fail(res, 'name is required', 422);
  if (!req.files?.preview?.[0] || !req.files?.file?.[0]) {
    return fail(res, 'Both a preview image (field "preview") and a brush file (field "file") are required', 422);
  }

  const previewFile = req.files.preview[0];
  const brushFile = req.files.file[0];
  const id = crypto.randomUUID();

  const previewExt = previewFile.originalname.split('.').pop();
  const previewPath = `${id}/preview.${previewExt}`;
  const { error: previewError } = await supabaseAdmin.storage
    .from('brush-previews')
    .upload(previewPath, previewFile.buffer, { contentType: previewFile.mimetype, upsert: true });
  if (previewError) return fail(res, previewError.message, 400);

  const fileExt = brushFile.originalname.split('.').pop();
  const filePath = `${id}/brush.${fileExt}`;
  const { error: fileError } = await supabaseAdmin.storage
    .from('brush-files')
    .upload(filePath, brushFile.buffer, { contentType: brushFile.mimetype, upsert: true });
  if (fileError) return fail(res, fileError.message, 400);

  const { data: previewUrl } = supabaseAdmin.storage.from('brush-previews').getPublicUrl(previewPath);
  const { data: fileUrl } = supabaseAdmin.storage.from('brush-files').getPublicUrl(filePath);

  const { data, error } = await supabaseAdmin
    .from('brushes')
    .insert({
      id,
      name,
      description,
      category_id: category_id || null,
      preview_image_url: previewUrl.publicUrl,
      file_url: fileUrl.publicUrl,
      file_size_kb: Math.round(brushFile.size / 1024),
      is_premium: is_premium === 'true' || is_premium === true,
      default_size: default_size ? Number(default_size) : 50,
      default_opacity: default_opacity ? Number(default_opacity) : 100,
      default_flow: default_flow ? Number(default_flow) : 100,
      tags: parseTags(tags),
      uploaded_by: req.profile.id
    })
    .select()
    .single();
  if (error) return fail(res, error.message, 400);

  await supabaseAdmin.from('analytics').insert({ event_type: 'brush_upload', user_id: req.profile.id, brush_id: id });

  return ok(res, data, 'Brush uploaded', 201);
});

const updateBrush = asyncHandler(async (req, res) => {
  const { name, description, category_id, is_premium, default_size, default_opacity, default_flow, tags, is_active } = req.body;
  const updates = {};

  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (category_id !== undefined) updates.category_id = category_id || null;
  if (is_premium !== undefined) updates.is_premium = is_premium === 'true' || is_premium === true;
  if (default_size !== undefined) updates.default_size = Number(default_size);
  if (default_opacity !== undefined) updates.default_opacity = Number(default_opacity);
  if (default_flow !== undefined) updates.default_flow = Number(default_flow);
  if (tags !== undefined) updates.tags = parseTags(tags);
  if (is_active !== undefined) updates.is_active = is_active === 'true' || is_active === true;

  if (req.files?.preview?.[0]) {
    const previewFile = req.files.preview[0];
    const ext = previewFile.originalname.split('.').pop();
    const path = `${req.params.id}/preview.${ext}`;
    const { error } = await supabaseAdmin.storage
      .from('brush-previews')
      .upload(path, previewFile.buffer, { contentType: previewFile.mimetype, upsert: true });
    if (error) return fail(res, error.message, 400);
    const { data: pub } = supabaseAdmin.storage.from('brush-previews').getPublicUrl(path);
    updates.preview_image_url = pub.publicUrl;
  }

  if (req.files?.file?.[0]) {
    const brushFile = req.files.file[0];
    const ext = brushFile.originalname.split('.').pop();
    const path = `${req.params.id}/brush.${ext}`;
    const { error } = await supabaseAdmin.storage
      .from('brush-files')
      .upload(path, brushFile.buffer, { contentType: brushFile.mimetype, upsert: true });
    if (error) return fail(res, error.message, 400);
    const { data: pub } = supabaseAdmin.storage.from('brush-files').getPublicUrl(path);
    updates.file_url = pub.publicUrl;
    updates.file_size_kb = Math.round(brushFile.size / 1024);
  }

  if (Object.keys(updates).length === 0) return fail(res, 'No valid fields to update', 422);

  const { data, error } = await supabaseAdmin.from('brushes').update(updates).eq('id', req.params.id).select().single();
  if (error) return fail(res, error.message, 400);

  return ok(res, data, 'Brush updated');
});

const deleteBrush = asyncHandler(async (req, res) => {
  const { data: brush } = await supabaseAdmin.from('brushes').select('id').eq('id', req.params.id).single();
  if (!brush) return fail(res, 'Brush not found', 404);

  await removeFolder('brush-previews', req.params.id);
  await removeFolder('brush-files', req.params.id);

  const { error } = await supabaseAdmin.from('brushes').delete().eq('id', req.params.id);
  if (error) return fail(res, error.message, 400);

  return ok(res, null, 'Brush deleted');
});

module.exports = { listBrushes, getBrush, createBrush, updateBrush, deleteBrush };

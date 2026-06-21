const { supabaseAdmin } = require('../config/supabase');
const { ok, fail } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

const createCollection = asyncHandler(async (req, res) => {
  const { name, description, is_public } = req.body;
  if (!name) return fail(res, 'name is required', 422);

  const { data, error } = await supabaseAdmin
    .from('collections')
    .insert({ user_id: req.profile.id, name, description, is_public: !!is_public })
    .select()
    .single();
  if (error) return fail(res, error.message, 400);

  return ok(res, data, 'Collection created', 201);
});

const myCollections = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('collections')
    .select('*, collection_brushes(count)')
    .eq('user_id', req.profile.id)
    .order('created_at', { ascending: false });
  if (error) return fail(res, error.message, 400);

  const formatted = data.map((c) => ({
    ...c,
    brush_count: c.collection_brushes?.[0]?.count ?? 0,
    collection_brushes: undefined
  }));

  return ok(res, formatted, 'Collections fetched');
});

const getCollection = asyncHandler(async (req, res) => {
  const { data: collection, error } = await supabaseAdmin.from('collections').select('*').eq('id', req.params.id).single();
  if (error) return fail(res, 'Collection not found', 404);
  if (collection.user_id !== req.profile.id && !collection.is_public) {
    return fail(res, 'Not authorized to view this collection', 403);
  }

  const { data: brushes } = await supabaseAdmin
    .from('collection_brushes')
    .select('added_at, brushes(*)')
    .eq('collection_id', req.params.id)
    .order('added_at', { ascending: false });

  return ok(res, { ...collection, brushes }, 'Collection fetched');
});

const updateCollection = asyncHandler(async (req, res) => {
  const { data: collection } = await supabaseAdmin.from('collections').select('user_id').eq('id', req.params.id).single();
  if (!collection) return fail(res, 'Collection not found', 404);
  if (collection.user_id !== req.profile.id) return fail(res, 'Not authorized', 403);

  const { name, description, is_public } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (is_public !== undefined) updates.is_public = !!is_public;

  const { data, error } = await supabaseAdmin.from('collections').update(updates).eq('id', req.params.id).select().single();
  if (error) return fail(res, error.message, 400);

  return ok(res, data, 'Collection updated');
});

const deleteCollection = asyncHandler(async (req, res) => {
  const { data: collection } = await supabaseAdmin.from('collections').select('user_id').eq('id', req.params.id).single();
  if (!collection) return fail(res, 'Collection not found', 404);
  if (collection.user_id !== req.profile.id) return fail(res, 'Not authorized', 403);

  const { error } = await supabaseAdmin.from('collections').delete().eq('id', req.params.id);
  if (error) return fail(res, error.message, 400);

  return ok(res, null, 'Collection deleted');
});

const addBrushToCollection = asyncHandler(async (req, res) => {
  const { data: collection } = await supabaseAdmin.from('collections').select('user_id').eq('id', req.params.id).single();
  if (!collection) return fail(res, 'Collection not found', 404);
  if (collection.user_id !== req.profile.id) return fail(res, 'Not authorized', 403);

  const { brush_id } = req.body;
  if (!brush_id) return fail(res, 'brush_id is required', 422);

  const { data: existing } = await supabaseAdmin
    .from('collection_brushes')
    .select('id')
    .eq('collection_id', req.params.id)
    .eq('brush_id', brush_id)
    .maybeSingle();
  if (existing) return fail(res, 'Brush already in collection', 409);

  const { data, error } = await supabaseAdmin
    .from('collection_brushes')
    .insert({ collection_id: req.params.id, brush_id })
    .select()
    .single();
  if (error) return fail(res, error.message, 400);

  return ok(res, data, 'Brush added to collection', 201);
});

const removeBrushFromCollection = asyncHandler(async (req, res) => {
  const { data: collection } = await supabaseAdmin.from('collections').select('user_id').eq('id', req.params.id).single();
  if (!collection) return fail(res, 'Collection not found', 404);
  if (collection.user_id !== req.profile.id) return fail(res, 'Not authorized', 403);

  const { error } = await supabaseAdmin
    .from('collection_brushes')
    .delete()
    .eq('collection_id', req.params.id)
    .eq('brush_id', req.params.brushId);
  if (error) return fail(res, error.message, 400);

  return ok(res, null, 'Brush removed from collection');
});

module.exports = {
  createCollection,
  myCollections,
  getCollection,
  updateCollection,
  deleteCollection,
  addBrushToCollection,
  removeBrushFromCollection
};

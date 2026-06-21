const { supabaseAdmin } = require('../config/supabase');
const { ok, fail } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const listCategories = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('*, brushes(count)')
    .order('sort_order', { ascending: true });
  if (error) return fail(res, error.message, 400);

  const formatted = data.map((c) => ({
    ...c,
    brush_count: c.brushes?.[0]?.count ?? 0,
    brushes: undefined
  }));

  return ok(res, formatted, 'Categories fetched');
});

const getCategory = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin.from('categories').select('*').eq('id', req.params.id).single();
  if (error) return fail(res, 'Category not found', 404);
  return ok(res, data, 'Category fetched');
});

const createCategory = asyncHandler(async (req, res) => {
  const { name, icon_url, description, sort_order } = req.body;
  if (!name) return fail(res, 'name is required', 422);

  const { data, error } = await supabaseAdmin
    .from('categories')
    .insert({ name, slug: slugify(name), icon_url, description, sort_order: sort_order ?? 0 })
    .select()
    .single();
  if (error) return fail(res, error.message, 400);

  return ok(res, data, 'Category created', 201);
});

const updateCategory = asyncHandler(async (req, res) => {
  const { name, icon_url, description, sort_order } = req.body;
  const updates = {};
  if (name) {
    updates.name = name;
    updates.slug = slugify(name);
  }
  if (icon_url !== undefined) updates.icon_url = icon_url;
  if (description !== undefined) updates.description = description;
  if (sort_order !== undefined) updates.sort_order = sort_order;

  const { data, error } = await supabaseAdmin.from('categories').update(updates).eq('id', req.params.id).select().single();
  if (error) return fail(res, error.message, 400);

  return ok(res, data, 'Category updated');
});

const deleteCategory = asyncHandler(async (req, res) => {
  const { error } = await supabaseAdmin.from('categories').delete().eq('id', req.params.id);
  if (error) return fail(res, error.message, 400);
  return ok(res, null, 'Category deleted');
});

module.exports = { listCategories, getCategory, createCategory, updateCategory, deleteCategory };

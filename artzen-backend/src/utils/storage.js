const { supabaseAdmin } = require('../config/supabase');

// Supabase Storage has no "delete folder" call - list the folder's files
// first, then remove them by full path.
async function removeFolder(bucket, prefix) {
  const { data: files, error } = await supabaseAdmin.storage.from(bucket).list(prefix);
  if (error || !files || files.length === 0) return;
  const paths = files.map((f) => `${prefix}/${f.name}`);
  await supabaseAdmin.storage.from(bucket).remove(paths);
}

module.exports = { removeFolder };

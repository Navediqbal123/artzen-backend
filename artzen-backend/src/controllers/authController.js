const { supabaseAnon, supabaseAdmin } = require('../config/supabase');
const { ok, fail } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

const USERNAME_REGEX = /^[a-zA-Z0-9_.]{3,20}$/;

const signup = asyncHandler(async (req, res) => {
  const { email, password, username } = req.body;
  if (!email || !password || !username) return fail(res, 'email, password and username are required', 422);
  if (password.length < 8) return fail(res, 'Password must be at least 8 characters', 422);
  if (!USERNAME_REGEX.test(username)) {
    return fail(res, 'Username must be 3-20 characters: letters, numbers, underscore or dot only', 422);
  }

  const { data: existing } = await supabaseAdmin.from('users').select('id').eq('username', username).maybeSingle();
  if (existing) return fail(res, 'Username already taken', 409);

  const { data, error } = await supabaseAnon.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: process.env.EMAIL_VERIFY_REDIRECT_URL
    }
  });
  if (error) return fail(res, error.message, 400);

  // public.users row is created automatically by the handle_new_auth_user
  // DB trigger (see sql/002_functions_triggers.sql)

  return ok(
    res,
    {
      user_id: data.user?.id,
      email: data.user?.email,
      email_confirmed: !!data.user?.email_confirmed_at,
      session: data.session
    },
    'Signup successful. Please verify your email.',
    201
  );
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return fail(res, 'email and password are required', 422);

  const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });
  if (error) return fail(res, error.message, 401);

  const { data: profile } = await supabaseAdmin.from('users').select('*').eq('id', data.user.id).single();
  if (profile?.is_banned) return fail(res, 'This account has been banned', 403);

  return ok(res, { session: data.session, user: profile }, 'Login successful');
});

const logout = asyncHandler(async (req, res) => {
  await supabaseAdmin.auth.admin.signOut(req.token).catch(() => {});
  return ok(res, null, 'Logged out');
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return fail(res, 'email is required', 422);

  const { error } = await supabaseAnon.auth.resetPasswordForEmail(email, {
    redirectTo: process.env.PASSWORD_RESET_REDIRECT_URL
  });
  // Always respond success regardless of whether the email exists, to avoid account enumeration
  if (error) return fail(res, error.message, 400);

  return ok(res, null, 'If an account exists for this email, a password reset link has been sent.');
});

// Called by the client after it has established a "recovery" session from
// the password-reset email link (Supabase issues a temporary session token
// for this). req.authUser is resolved by requireAuth from that token.
const resetPassword = asyncHandler(async (req, res) => {
  const { new_password } = req.body;
  if (!new_password || new_password.length < 8) return fail(res, 'new_password must be at least 8 characters', 422);

  const { error } = await supabaseAdmin.auth.admin.updateUserById(req.authUser.id, { password: new_password });
  if (error) return fail(res, error.message, 400);

  return ok(res, null, 'Password updated successfully');
});

const refreshToken = asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) return fail(res, 'refresh_token is required', 422);

  const { data, error } = await supabaseAnon.auth.refreshSession({ refresh_token });
  if (error) return fail(res, error.message, 401);

  return ok(res, { session: data.session }, 'Token refreshed');
});

const me = asyncHandler(async (req, res) => {
  return ok(res, req.profile, 'Current user');
});

const updateProfile = asyncHandler(async (req, res) => {
  const { username, bio } = req.body;
  const updates = {};

  if (username && username !== req.profile.username) {
    if (!USERNAME_REGEX.test(username)) return fail(res, 'Invalid username format', 422);
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', username)
      .neq('id', req.profile.id)
      .maybeSingle();
    if (existing) return fail(res, 'Username already taken', 409);
    updates.username = username;
  }
  if (bio !== undefined) updates.bio = bio;

  if (Object.keys(updates).length === 0) return fail(res, 'No valid fields to update', 422);

  const { data, error } = await supabaseAdmin.from('users').update(updates).eq('id', req.profile.id).select().single();
  if (error) return fail(res, error.message, 400);

  return ok(res, data, 'Profile updated');
});

const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) return fail(res, 'No file uploaded', 422);

  const ext = req.file.originalname.split('.').pop();
  const path = `${req.profile.id}/avatar.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from('avatars')
    .upload(path, req.file.buffer, { contentType: req.file.mimetype, upsert: true });
  if (uploadError) return fail(res, uploadError.message, 400);

  const { data: pub } = supabaseAdmin.storage.from('avatars').getPublicUrl(path);

  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ profile_photo_url: pub.publicUrl })
    .eq('id', req.profile.id)
    .select()
    .single();
  if (error) return fail(res, error.message, 400);

  return ok(res, data, 'Avatar updated');
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return fail(res, 'email and code are required', 422);

  const { data, error } = await supabaseAnon.auth.verifyOtp({
    email,
    token: code,
    type: 'signup'
  });
  if (error) return fail(res, error.message, 400);

  return ok(res, { session: data.session, user: data.user }, 'Email verified successfully');
});

module.exports = {
  signup,
  login,
  logout,
  forgotPassword,
  resetPassword,
  refreshToken,
  me,
  updateProfile,
  uploadAvatar,
  verifyEmail
};

const multer = require('multer');

const storage = multer.memoryStorage();

const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only image files are allowed'));
};

const uploadAvatar = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: imageFilter
});

// Brush uploads accept two fields: "preview" (image) and "file" (the actual brush asset)
const uploadBrushAssets = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

module.exports = { uploadAvatar, uploadBrushAssets };

import multer from "multer";

// 1. Storage Configuration
// We use memoryStorage() instead of diskStorage().
// This keeps the file in RAM (memory) temporarily as a Buffer.
// It's perfect for Supabase Storage because we can upload directly from memory 
// without cluttering our server's hard drive with temporary files.
const storage = multer.memoryStorage();

// 2. File Validation (Security)
// This function runs before the file is accepted.
const fileFilter = (req, file, cb) => {
  // Check if the file's mimetype starts with "image/" (e.g., image/jpeg, image/png)
  if (file.mimetype.startsWith("image/")) {
    // Accept the file by passing `true` to the callback (cb)
    cb(null, true);
  } else {
    // Reject the file by throwing an error and passing `false`
    cb(new Error("Only image files are allowed!"), false);
  }
};

// 3. Initialize Multer
const upload = multer({
  storage: storage,       // Where to store the file (in memory)
  fileFilter: fileFilter, // Our custom validation logic
  limits: {
    fileSize: 5 * 1024 * 1024, // Maximum file size: 5 Megabytes
  },
});

// 4. Export Reusable Middleware
// We wrap multer in a custom function so we can catch errors (like file size limit)
// and return a clean JSON response instead of a 500 server crash.
const multerUpload = upload.single("image");

export const uploadImage = (req, res, next) => {
  multerUpload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading (e.g., LIMIT_FILE_SIZE)
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}. Limit is 5MB.` });
    } else if (err) {
      // An unknown error occurred when uploading (e.g., wrong file type)
      return res.status(400).json({ success: false, message: err.message });
    }
    // Everything went fine
    next();
  });
};


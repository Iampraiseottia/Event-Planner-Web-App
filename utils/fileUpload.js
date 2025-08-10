const multer = require("multer");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  console.log("=== MULTER FILE FILTER ===");
  console.log("File info:", {
    fieldname: file.fieldname,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
  });

  // Check file type
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  if (allowedTypes.includes(file.mimetype.toLowerCase())) {
    console.log("File type accepted:", file.mimetype);
    cb(null, true);
  } else {
    console.log("File type rejected:", file.mimetype);
    cb(
      new Error(
        "Invalid file type. Only JPEG, PNG, and WebP images are allowed."
      ),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// Error handling
const handleMulterError = (error, req, res, next) => {
  console.error("=== MULTER ERROR ===");
  console.error("Error:", error);

  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case "LIMIT_FILE_SIZE":
        return res.status(400).json({
          error: "File too large. Maximum size is 5MB.",
        });
      case "LIMIT_FILE_COUNT":
        return res.status(400).json({
          error: "Too many files. Only one file is allowed.",
        });
      case "LIMIT_UNEXPECTED_FILE":
        return res.status(400).json({
          error:
            "Unexpected file field. Please use the correct form field name.",
        });
      default:
        return res.status(400).json({
          error: "File upload error: " + error.message,
        });
    }
  }

  if (error.message.includes("Invalid file type")) {
    return res.status(400).json({
      error: error.message,
    });
  }

  next(error);
};

module.exports = upload;

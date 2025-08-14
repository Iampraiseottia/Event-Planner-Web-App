const pool = require("../config/database");
const { verifyToken, extractTokenFromRequest } = require("../utils/jwt");

// Authentication using JWT cookies
const requireAuth = (req, res, next) => {
  const token = extractTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({
      error: "Authentication required. Please log in.",
      authenticated: false,
    });
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    res.clearCookie("authToken");
    return res.status(401).json({
      error: "Invalid or expired token. Please log in again.",
      authenticated: false,
    });
  }

  // Attach user info to request
  req.user = decoded;
  return next();
};

// Check if user is a customer
const requireCustomer = (req, res, next) => {
  if (req.user && req.user.user_type === "customer") {
    return next();
  } else {
    return res.status(403).json({
      error: "Customer access required.",
    });
  }
};

// Check if user is a planner
const requirePlanner = (req, res, next) => {
  console.log("=== REQUIRE PLANNER DEBUG ===");
  console.log("User from token:", req.user);
  console.log("User type:", req.user?.user_type);

  if (!req.user) {
    return res.status(401).json({
      error: "Authentication required",
      authenticated: false,
    });
  }

  if (req.user.user_type !== "planner") {
    return res.status(403).json({
      error: "Planner access required",
    });
  }

  next();
};

// Check if user is authenticated (any type)
const requireAnyAuth = (req, res, next) => {
  if (req.user) {
    return next();
  } else {
    return res.status(401).json({
      error: "Authentication required. Please log in.",
      authenticated: false,
    });
  }
};

// Check if user owns the resource
const requireOwnership = (req, res, next) => {
  if (req.user) {
    return next();
  } else {
    return res.status(401).json({
      error: "Authentication required.",
      authenticated: false,
    });
  }
};

// Check Complete Profile
const requireCompleteProfile = async (req, res, next) => {
  try {
    if (!req.user || req.user.user_type !== "planner") {
      return res.status(403).json({
        error: "Access denied. Planner account required.",
      });
    }

    const userId = req.user.id;

    // Check profile completion
    const profileCheck = await pool.query(
      `
      SELECT 
        CASE WHEN 
          u.id_card_data IS NOT NULL AND 
          u.birth_certificate_data IS NOT NULL AND
          EXISTS (
            SELECT 1 FROM planners p 
            WHERE p.user_id = u.id 
            AND p.business_name IS NOT NULL 
            AND p.bio IS NOT NULL 
            AND p.experience IS NOT NULL 
            AND p.base_price IS NOT NULL
          )
        THEN TRUE ELSE FALSE END as is_complete
      FROM users u WHERE u.id = $1
    `,
      [userId]
    );

    const isComplete = profileCheck.rows[0]?.is_complete || false;

    if (!isComplete) {
      return res.status(400).json({
        error: "Please complete your profile before accessing this feature.",
        profileComplete: false,
      });
    }

    next();
  } catch (error) {
    console.error("Profile completion check error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  requireAuth,
  requireCustomer,
  requirePlanner,
  requireAnyAuth,
  requireOwnership,
  requireCompleteProfile,
};

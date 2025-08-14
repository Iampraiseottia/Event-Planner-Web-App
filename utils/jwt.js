const jwt = require("jsonwebtoken");

const JWT_SECRET =
  process.env.JWT_SECRET || process.env.SESSION_SECRET || "fallback-secret-key";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// Generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: "eventify-app",
    audience: "eventify-users",
  });
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: "eventify-app",
      audience: "eventify-users",
    });
  } catch (error) {
    console.error("JWT verification error:", error.message);
    return null;
  }
};

// Extract token from request cookies
const extractTokenFromRequest = (req) => {
  return req.cookies?.authToken || null;
};

// Cookie configuration
const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  domain: process.env.NODE_ENV === "production" ? undefined : undefined,
});

module.exports = {
  generateToken,
  verifyToken,
  extractTokenFromRequest,
  getCookieOptions,
};

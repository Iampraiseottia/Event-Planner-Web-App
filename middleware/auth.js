// Authentication middleware using sessions
const requireAuth = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  } else {
    return res.status(401).json({
      error: "Authentication required. Please log in.",
    });
  }
};

// Check if user is a customer
const requireCustomer = (req, res, next) => {
  if (
    req.session &&
    req.session.user &&
    req.session.user.user_type === "customer"
  ) {
    return next();
  } else {
    return res.status(403).json({
      error: "Customer access required.",
    });
  }
};

// Check if user is a planner
const requirePlanner = (req, res, next) => {
  if (
    req.session &&
    req.session.user &&
    req.session.user.user_type === "planner"
  ) {
    return next();
  } else {
    return res.status(403).json({
      error: "Planner access required.",
    });
  }
};

// Check if user is authenticated
const requireAnyAuth = (req, res, next) => {
  if (req.session && req.session.user) {
    req.user = req.session.user;
    return next();
  } else {
    return res.status(401).json({
      error: "Authentication required. Please log in.",
    });
  }
};

// Check if user owns the resource (for customer bookings)
const requireOwnership = (req, res, next) => {
  if (req.session && req.session.user) {
    req.user = req.session.user;
    return next();
  } else {
    return res.status(401).json({
      error: "Authentication required.",
    });
  }
};

module.exports = {
  requireAuth,
  requireCustomer,
  requirePlanner,
  requireAnyAuth,
  requireOwnership,
};

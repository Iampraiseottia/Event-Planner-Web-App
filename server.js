const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const session = require("express-session");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const bookingRoutes = require("./routes/booking");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.FRONTEND_URL
        : "http://localhost:3000",
    credentials: true,
  })
);
app.use(morgan("combined"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);

// Catch-all route for frontend files
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "index.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});

module.exports = app;

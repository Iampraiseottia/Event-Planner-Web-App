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
    contentSecurityPolicy: false, // Disable for development
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
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Serve static files directly from the current directory (project root)
// This means CSS, JS, img, and html folders should be in the project root.
app.use(express.static(__dirname)); // Changed this line

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);

// Serve index.html directly from the project root (already correct)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Serve other HTML files from the 'html' directory in the project root
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "login.html")); // Changed this line
});

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "register.html")); // Changed this line
});

app.get("/book", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "book.html")); // Changed this line
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

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

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public"))); // Reverted to public folder

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);

// Serve HTML files from public/
// index.html is now inside the public folder
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html")); // Path updated
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "login.html")); // Path updated
});

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "register.html")); // Path updated
});

app.get("/book", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "book.html")); // Path updated
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

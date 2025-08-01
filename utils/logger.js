const fs = require("fs");
const path = require("path");

const logDir = path.join(__dirname, "..", "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

function log(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    meta,
  };

  const logFile = path.join(
    logDir,
    `${new Date().toISOString().split("T")[0]}.log`
  );
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + "\n");

  if (process.env.NODE_ENV !== "production") {
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, meta);
  }
}

module.exports = {
  info: (message, meta) => log("info", message, meta),
  error: (message, meta) => log("error", message, meta),
  warn: (message, meta) => log("warn", message, meta),
  debug: (message, meta) => log("debug", message, meta),
};

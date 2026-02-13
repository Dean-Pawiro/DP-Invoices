// backend/index.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/invoices", require("./routes/invoices"));
app.use("/api/clients", require("./routes/clients"));
app.use("/api/company", require("./routes/company"));
app.use("/api/rates", require("./routes/rates"));
app.use("/api/database", require("./routes/database"));

const PORT = process.env.BACKEND_PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
});

// Keep the process alive and handle errors gracefully
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
});

// Prevent process from exiting
process.on('SIGTERM', () => {
  console.log('⚠️ SIGTERM received, closing server...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('⚠️ SIGINT received, closing server...');
  server.close(() => {
    process.exit(0);
  });
});

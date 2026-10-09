const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const incomeRoutes = require("./routes/income");
const expenseRoutes = require("./routes/expenses");
const expenseCategoryRoutes = require("./routes/expenseCategories");
const habitRoutes = require("./routes/habits");
const goalRoutes = require("./routes/goals");
const assetRoutes = require("./routes/assets");
const netWorthRoutes = require("./routes/networth");
const dashboardRoutes = require("./routes/dashboard");
const adminRoutes = require("./routes/admin");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// CORS — allow explicitly listed origins, wildcard, or local development origins.
const rawOrigins = process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:5174,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:3000";
const allowedOrigins = rawOrigins
  .split(",")
  .map((o) => o.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const isLocalOrigin = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

app.use(
  cors({
    origin(origin, callback) {
      // Allow server-to-server / same-origin requests (origin is undefined)
      if (!origin) {
        return callback(null, true);
      }
      const normalized = origin.replace(/\/+$/, "");
      if (allowedOrigins.includes("*") || allowedOrigins.includes(normalized) || isLocalOrigin(normalized)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  }),
);
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/income", incomeRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/expense-categories", expenseCategoryRoutes);
app.use("/api/habits", habitRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/networth", netWorthRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "GrowFi API is running",
  });
});

app.use(errorHandler);

module.exports = app;
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

app.use(cors());
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
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const incomeRoutes = require("./routes/income");
const expenseRoutes = require("./routes/expenses");
const expenseCategoryRoutes = require("./routes/expenseCategories");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/income", incomeRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/expense-categories", expenseCategoryRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "GrowFi API is running",
  });
});

app.use(errorHandler);

module.exports = app;
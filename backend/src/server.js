require("dotenv").config();

const app = require("./app");

const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be configured before starting the API");
}

app.listen(PORT, () => {
  console.log(`GrowFi API running on http://localhost:${PORT}`);
});
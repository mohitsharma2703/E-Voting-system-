const config = require("./config");
const connectDb = require("./db");
const app = require("./app");

(async () => {
  try {
    await connectDb();
    app.listen(config.port, () => console.log(`E-Voting System API listening on http://localhost:${config.port}`));
  } catch (err) {
    console.error("Failed to start:", err.message);
    process.exit(1);
  }
})();

const mongoose = require("mongoose");
const config = require("./config");

module.exports = async function connectDb() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(config.mongoUri);
  console.log("MongoDB connected:", mongoose.connection.name);
};

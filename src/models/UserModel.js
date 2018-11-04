const mongoose = require("mongoose");
const schema = mongoose.Schema;

const UserSchema = new schema({
  name: String,
  email: String,
  password: String,
  token: String
});

module.exports = mongoose.model("User", UserSchema);

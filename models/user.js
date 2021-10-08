const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  name: String,
  surname: String,
  emailToken: {
    type: String,
    unique: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  isAdmin: {
    type: Boolean,
    default: false,
  },
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", UserSchema);

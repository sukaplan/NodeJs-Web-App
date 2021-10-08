var User = require("../models/user");
var middlewareObj = {};

middlewareObj.isNotVerified = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.body.username });
    if (user.isVerified) {
      return next();
    }
    req.flash("error", "Please verify your account.");
    res.redirect("/");
  } catch (error) {
    req.flash("error", "Something went wrong");
    res.redirect("/home");
  }
};

middlewareObj.isNotAdmin = async (req, res, next) => {
  try {
    const user = await User.find({ username: req.body.username });
    if (user.isAdmin) {
      return next();
    }
    req.flash("You must be the site administrator to see this");
    res.redirect("/");
  } catch (error) {
    req.flash("error", "Something went wrong");
    req.redirect("/");
  }
};
module.exports = middlewareObj;

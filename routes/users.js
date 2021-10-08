const express = require("express");
const router = express.Router();
const passport = require("passport");
const catchAsync = require("../utils/catchAsync");
const User = require("../models/user");
const users = require("../controllers/users");
const { isNotVerified, isNotAdmin } = require("../middleware/index");

router
  .route("/register")
  .get(users.renderRegister)
  .post(catchAsync(users.register));

router
  .route("/login")
  .get(users.renderLogin)
  .post(
    isNotVerified,
    passport.authenticate("local", {
      failureFlash: true,
      failureRedirect: "/login",
    }),
    users.login
  );

router.get("/logout", users.logout);

router.get("/verify", async (req, res) => {
  try {
    const user = await User.findOne({
      token: req.query.token,
    });

    if (!user) {
      req.flash("error", "Invalid token.");
      res.redirect("/");
    }
    user.emailToken = null;
    user.isVerified = true;
    await user.save();
    await req.login(user, (err) => {
      if (err) {
        console.log(err);
      }
      req.flash("success", "Welcome");
      const redirectUrl = req.session.returnTo || "/home";
      delete req.session.returnTo;
      res.redirect(redirectUrl);
    });
  } catch (error) {
    console.log(error);
    res.redirect("/");
  }
});

router.get("/forgot-password", (req, res, next) => {
  res.render("users/forgot", { user: req.user });
});

router.route("/forgot-password").post(users.forgot);

router.get("/reset/:token", (req, res, next) => {
  User.findOne(
    {
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() },
    },
    function (err, user) {
      if (!user) {
        req.flash("error", "Password reset token is invalid or has expired.");
        return res.redirect("/forgot-password");
      }
      res.render("users/reset", { token: req.params.token });
    }
  );
});

router.route("/reset/:token").post(users.reset);

router.get("/registeredUsers", isNotAdmin, (req, res, next) => {
  res.render("registeredUsers");
});

router.route("/registeredUsers").post(isNotAdmin, users.registeredUsers);
module.exports = router;

require("dotenv").config();
const User = require("../models/user");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const user = process.env.GMAIL_USER;
const pass = process.env.GMAIL_PASS;
var async = require("async");
const { isNotVerified } = require("../middleware/index");

const smtp = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: user,
    pass: pass,
  },
});

var emailToken, mailOptions, host, link;
module.exports.renderRegister = (req, res) => {
  res.render("users/register");
};

module.exports.register = async (req, res, next) => {
  try {
    const { email, username, name, surname, password, confirmPassword } =
      req.body;
    if (password !== confirmPassword) {
      req.flash("error", "Passwords do not match");
      return res.redirect("register");
    }

    emailToken = crypto.randomBytes(64).toString("hex");
    const user = new User({ email, name, surname, emailToken, username });
    const registeredUser = await User.register(user, password);

    host = req.get("host");
    link = "http://" + req.get("host") + "/verify?id=" + emailToken;
    mailOptions = {
      to: registeredUser.email,
      subject: "Please confirm your Email account",
      html:
        "Hello,<br> Please Click on the link to verify your email.<br><a href=" +
        link +
        ">Click here to verify</a>",
    };
    console.log(mailOptions);
    smtp.sendMail(mailOptions, function (error, response) {
      if (error) {
        res.render("error");
      } else {
        req.flash("success", "Please check your email to verify your account");
        res.redirect("/home");
      }
    });
    req.login(registeredUser, isNotVerified, (err) => {
      if (err) return next(err);
      req.flash("success", "Welcome");
      res.redirect("/home");
    });
  } catch (e) {
    console.log(e);
    req.flash("error", e.message);
    res.redirect("register");
  }
};

module.exports.renderLogin = (req, res) => {
  res.render("users/login");
};

module.exports.login = (req, res) => {
  req.flash("success", "welcome back!");
  const redirectUrl = req.session.returnTo || "/home";
  delete req.session.returnTo;
  res.redirect(redirectUrl);
};

module.exports.logout = (req, res) => {
  req.logout();
  // req.session.destroy();
  req.flash("success", "Goodbye!");
  res.redirect("/");
};

module.exports.forgot = (req, res, next) => {
  async.waterfall(
    [
      function (done) {
        crypto.randomBytes(20, function (err, buf) {
          var token = buf.toString("hex");
          done(err, token);
        });
      },
      function (token, done) {
        User.findOne({ email: req.body.email }, function (err, user) {
          if (!user) {
            req.flash("error", "No account with that email address exists.");
            return res.redirect("/forgot");
          }

          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

          user.save(function (err) {
            done(err, token, user);
          });
        });
      },
      function (token, user, done) {
        var mailOptions = {
          to: user.email,
          subject: "Node.js Password Reset",
          text:
            "You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n" +
            "Please click on the following link, or paste this into your browser to complete the process:\n\n" +
            "http://" +
            req.headers.host +
            "/reset/" +
            token +
            "\n\n" +
            "If you did not request this, please ignore this email and your password will remain unchanged.\n",
        };
        smtp.sendMail(mailOptions, function (err) {
          console.log("mail sent");
          req.flash(
            "success",
            "An e-mail has been sent to " +
              user.email +
              " with further instructions."
          );
          done(err, "done");
        });
      },
    ],
    function (err) {
      if (err) return next(err);
      res.redirect("/forgot-password");
    }
  );
};

module.exports.reset = (req, res, next) => {
  async.waterfall(
    [
      function (done) {
        User.findOne(
          {
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() },
          },
          function (err, user) {
            if (!user) {
              req.flash(
                "error",
                "Password reset token is invalid or has expired."
              );
              return res.redirect("back");
            }
            if (req.body.password === req.body.confirm) {
              user.setPassword(req.body.password, function (err) {
                user.resetPasswordToken = undefined;
                user.resetPasswordExpires = undefined;

                user.save(function (err) {
                  req.login(user, function (err) {
                    done(err, user);
                  });
                });
              });
            } else {
              req.flash("error", "Passwords do not match.");
              return res.redirect("back");
            }
          }
        );
      },
      function (user, done) {
        var mailOptions = {
          to: user.email,
          subject: "Your password has been changed",
          text:
            "Hello,\n\n" +
            "This is a confirmation that the password for your account " +
            user.email +
            " has just been changed.\n",
        };
        smtp.sendMail(mailOptions, function (err) {
          req.flash("success", "Success! Your password has been changed.");
          done(err);
        });
      },
    ],
    function (err) {
      res.redirect("/home");
    }
  );
};

module.exports.registeredUsers = async (req, res, next) => {
  await User.find({ isVerified: true, emailToken: null }, (error, users) => {
    if (error || !users) {
      req.flash("error", "Something went wrong");
      res.redirect("/home");
    }
    console.log(users);
    console.log("done");
    res.render("registeredUsers", { users });
  });
};

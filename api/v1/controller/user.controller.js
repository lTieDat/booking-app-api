const User = require("../../../models/user.model");
const md5 = require("md5");
const ForgotPassword = require("../../../models/forgotPassword");
const generateHelper = require("../../../helper/generate");
const mailHelper = require("../../../helper/sendmail");

// Helper function to handle responses
const handleResponse = (res, code, message, data = null) => {
  res.status(code).json({ message, data });
};

// Helper function to handle errors
const handleError = (res, error, message = "fail") => {
  console.error(error);
  res.status(500).json({ message });
};

// [POST] /api/v1/users/register
module.exports.register = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    // Check if the email already exists
    const existedEmail = await User.findOne({ email });
    if (existedEmail) {
      return handleResponse(res, 400, "Email already exists");
    }

    // Generate a verification token and set expiry time
    const verificationToken = generateHelper.genenrateRandomString(20);
    const token = generateHelper.genenrateRandomString(20);
    const expiredAt = Date.now() + 5 * 60 * 1000; // Token expires in 5 minutes

    // Create a new user with verification token and expiry time
    const user = new User({
      fullName,
      email,
      password: md5(password),
      token: token,
      verificationToken: verificationToken,
      verificationTokenExpiresAt: new Date(expiredAt),
      verified: false,
    });

    await user.save();

    // Send verification email
    const subject = "Please verify your email address";
    const html = `<h1>Welcome, ${fullName}!</h1>
                    <p>Please verify your email by entering the code:</p>
                    <h2>${verificationToken}</h2>`;
    await mailHelper.sendMail(email, subject, html);

    return handleResponse(
      res,
      200,
      "Registration successful. Please check your email to verify your account."
    );
  } catch (error) {
    handleError(res, error);
  }
};

// [POST] /api/v1/users/verify
module.exports.verifyEmail = async (req, res) => {
  try {
    const { otp, email } = req.body;

    // Find user by verification token
    const user = await User.findOne({
      verificationToken: otp,
      email: email,
      verified: false,
    });
    if (!user) {
      return handleResponse(res, 400, "Invalid or expired token");
    }

    // Mark user as verified
    user.verified = true;
    //remove verification token and expiry time
    user.verificationToken = undefined;
    user.verificationTokenExpiresAt = undefined;
    const token = user.token;
    await user.save();
    handleResponse(
      res,
      200,
      "Email verified successfully. You can now log in.",
      { token }
    );
  } catch (error) {
    handleError(res, error);
  }
};

// [POST] /api/v1/users/login
module.exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("email", email);
    console.log("password", password);
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return handleResponse(res, 400, "Email not found");
    }

    // Check password
    if (user.password !== md5(password)) {
      return handleResponse(res, 400, "Password incorrect");
    }
    const token = user.token;
    console.log("token", token);
    res.cookie("token", token);
    handleResponse(res, 200, "Login successful", { token });
  } catch (error) {
    handleError(res, error);
  }
};

// [POST] /api/v1/users/password/forgot
module.exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ email, deleted: false });
    if (!user) {
      return handleResponse(res, 400, "Email not found");
    }

    // Generate OTP and save to database
    const OTP = generateHelper.otp(8);
    const expiredAt = Date.now() + 5 * 60 * 1000; // OTP expires in 5 minutes

    const forgotPassword = new ForgotPassword({ email, otp: OTP, expiredAt });
    await forgotPassword.save();

    // Send OTP via email
    const subject = "OTP for Password Reset";
    const html = `<h1>Your OTP is: ${OTP}</h1><p>Please use this OTP to reset your password within 5 minutes.</p>`;
    await mailHelper.sendMail(email, subject, html);

    handleResponse(res, 200, "OTP has been sent to your email");
  } catch (error) {
    handleError(res, error);
  }
};

// [POST] /api/v1/users/password/otp
module.exports.verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    const email = req.cookies.email;

    // Find the OTP in the database
    const forgotPassword = await ForgotPassword.findOne({ email, otp });
    if (!forgotPassword) {
      return handleResponse(res, 400, "Invalid OTP");
    }

    // Check if OTP has expired
    if (forgotPassword.expiredAt < Date.now()) {
      return handleResponse(res, 400, "OTP has expired");
    }

    // Find the user and set token in cookie
    const user = await User.findOne({ email, deleted: false });
    res.cookie("token", user.token);
    handleResponse(res, 200, "OTP verified", { token: user.token });
  } catch (error) {
    handleError(res, error);
  }
};

// [POST] /api/v1/users/password/reset
module.exports.reset = async (req, res) => {
  try {
    const token = req.cookies.token;
    const newPassword = md5(req.body.password);

    // Find the user by token
    const user = await User.findOne({ token, deleted: false });
    if (!user) {
      return handleResponse(res, 400, "Invalid token");
    }

    // Check if the new password is the same as the old one
    if (user.password === newPassword) {
      return handleResponse(
        res,
        400,
        "New password cannot be the same as the old password"
      );
    }

    // Update the user's password
    user.password = newPassword;
    await user.save();

    handleResponse(res, 200, "Password reset successfully");
  } catch (error) {
    handleError(res, error);
  }
};

// [GET] /api/v1/users/detail
module.exports.detail = async (req, res) => {
  try {
    if (req.user) {
      handleResponse(res, 200, "User details", { data: req.user });
    } else {
      handleResponse(res, 400, "User not found");
    }
  } catch (error) {
    handleError(res, error);
  }
};

// [GET] /api/v1/users/list
module.exports.list = async (req, res) => {
  try {
    const users = await User.find({ deleted: false }).select("fullName email");
    handleResponse(res, 200, "User list", { data: users });
  } catch (error) {
    handleError(res, error);
  }
};

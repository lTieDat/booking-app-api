const User = require('../../../models/user.model')
const Prefix = require('../../../models/prefixPhone.model')
const md5 = require('md5')
const ForgotPassword = require('../../../models/forgotPassword')
const generateHelper = require('../../../helper/generate')
const mailHelper = require('../../../helper/sendmail')
const Account = require('../../../models/account.model')

const handleError = (res, error, message = 'fail') => {
  console.error(error)
  res.status(500).json({ message })
}

// Helper function to handle responses
const handleResponse = (res, status, message, data = {}) => {
  return res.status(status).json({ message: { message }, ...data })
}

// [POST] /api/v1/users/register
module.exports.register = async (req, res) => {
  try {
    const { fullName, email, password } = req.body

    // Validate required fields
    if (!fullName || !email || !password) {
      return handleResponse(res, 400, 'All fields are required')
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' })
    }

    // Check if email already exists
    const existedEmail = await User.findOne({ email })
    if (existedEmail) {
      return res.status(409).json({ message: 'Email already exists' })
    }

    // Check password strength (min 8 chars)
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' })
    }

    // Generate verification token and expiry time
    const verificationToken = generateHelper.genenrateRandomString(20)
    const token = generateHelper.genenrateRandomString(20)
    const expiredAt = Date.now() + 5 * 60 * 1000 // 5 min expiry
    const userName = 'User' + generateHelper.genenrateRandomString(5)

    // Create a new user
    const user = new User({
      fullName,
      email,
      password: md5(password),
      token,
      verificationToken,
      verificationTokenExpiresAt: new Date(expiredAt),
      isVerified: false,
      userName,
      phone: '',
      address: '',
      dateOfBirth: '',
    })

    await user.save()

    // Send verification email
    const subject = 'Please verify your email address'
    const html = `<h1>Welcome, ${fullName}!</h1>
                    <p>Please verify your email by entering the code:</p>
                    <h2>${verificationToken}</h2>`
    await mailHelper.sendMail(email, subject, html)

    return handleResponse(res, 201, 'Registration successful. Please check your email to verify your account.', {
      token,
    })
  } catch (error) {
    handleError(res, error)
  }
}

// [POST] /api/v1/users/verify
module.exports.verifyEmail = async (req, res) => {
  try {
    const { otp, email } = req.body

    // Find user by verification token
    const user = await User.findOne({
      verificationToken: otp,
      email: email,
      verified: false,
    })
    if (!user) {
      return handleResponse(res, 400, 'Invalid or expired token')
    }

    // Mark user as verified
    user.verified = true
    //remove verification token and expiry time
    user.verificationToken = undefined
    user.verificationTokenExpiresAt = undefined
    const token = user.token
    await user.save()
    handleResponse(res, 200, 'Email verified successfully. You can now log in.', { token })
  } catch (error) {
    handleError(res, error)
  }
}

// [POST] /api/v1/users/login
module.exports.login = async (req, res) => {
  try {
    const { email, password } = req.body

    // Find user by email
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(404).json({ message: 'Email not found' })
    }

    // Check if the account is verified
    if (!user.verified) {
      // Fixing key naming
      return res.status(403).json({ message: 'Account not verified' })
    }

    // Check password
    if (user.password !== md5(password)) {
      return res.status(403).json({ message: 'Incorrect password' }) // Fixing incorrect response status
    }

    // Ensure token exists in the user model
    if (!user.token) {
      return res.status(500).json({ message: 'Authentication token not found' })
    }

    // Set token in HTTP-only cookie
    res.cookie('token', user.token, { httpOnly: true, secure: true })

    return res.status(200).json({ message: 'Login successful', token: user.token })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ message: 'Login failed', error: error.message })
  }
}

// [POST] /api/v1/users/password/forgot
module.exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body

    // Find user by email
    const user = await User.findOne({ email, deleted: false })
    if (!user) {
      return handleResponse(res, 400, 'Email not found')
    }

    // Generate OTP and save to database
    const OTP = generateHelper.otp(8)
    const expiredAt = Date.now() + 5 * 60 * 1000 // OTP expires in 5 minutes

    const forgotPassword = new ForgotPassword({ email, otp: OTP, expiredAt })
    await forgotPassword.save()

    // Send OTP via email
    const subject = 'OTP for Password Reset'
    const html = `<h1>Your OTP is: ${OTP}</h1><p>Please use this OTP to reset your password within 5 minutes.</p>`
    await mailHelper.sendMail(email, subject, html)

    handleResponse(res, 200, 'OTP has been sent to your email')
  } catch (error) {
    handleError(res, error)
  }
}

// [POST] /api/v1/users/password/otp
module.exports.verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body
    const email = req.cookies.email

    // Find the OTP in the database
    const forgotPassword = await ForgotPassword.findOne({ email, otp })
    if (!forgotPassword) {
      return handleResponse(res, 400, 'Invalid OTP')
    }

    // Check if OTP has expired
    if (forgotPassword.expiredAt < Date.now()) {
      return handleResponse(res, 400, 'OTP has expired')
    }

    // Find the user and set token in cookie
    const user = await User.findOne({ email, deleted: false })
    res.cookie('token', user.token)
    handleResponse(res, 200, 'OTP verified', { token: user.token })
  } catch (error) {
    handleError(res, error)
  }
}

// [POST] /api/v1/users/password/reset
module.exports.reset = async (req, res) => {
  try {
    const token = req.cookies.token
    const newPassword = md5(req.body.password)

    // Find the user by token
    const user = await User.findOne({ token, deleted: false })
    if (!user) {
      return handleResponse(res, 400, 'Invalid token')
    }

    // Check if the new password is the same as the old one
    if (user.password === newPassword) {
      return handleResponse(res, 400, 'New password cannot be the same as the old password')
    }

    // Update the user's password
    user.password = newPassword
    await user.save()

    handleResponse(res, 200, 'Password reset successfully')
  } catch (error) {
    handleError(res, error)
  }
}

// [GET] /api/v1/users/list
module.exports.list = async (req, res) => {
  try {
    const users = await User.find({ deleted: false }).select('fullName email')
    handleResponse(res, 200, 'User list', { data: users })
  } catch (error) {
    handleError(res, error)
  }
}

//[GET] /api/v1/users/prefix
module.exports.prefix = async (req, res) => {
  try {
    const prefix = await Prefix.find()
    handleResponse(res, 200, 'Prefix list', { data: prefix })
  } catch (error) {
    handleError(res, error)
  }
}

//[GET] /api/v1/users/me
module.exports.me = async (req, res) => {
  try {
    const userToken = req.query.tokenID
    const user = await User.findOne({
      token: userToken,
    }).select('fullName email phone address dateOfBirth userName')
    handleResponse(res, 200, 'User details', { data: user, status: 200 })
  } catch (error) {
    handleError(res, error)
  }
}

//[POST] /api/v1/users/update
module.exports.update = async (req, res) => {
  try {
    console.log('req.body', req.body)
    const userToken = req.query.tokenID
    console.log('userToken', userToken)
    const { fullName, phone, address, dateOfBirth, userName, email } = req.body
    const user = await User.findOne({ token: userToken })
    if (!user) {
      return handleResponse(res, 400, 'User not found')
    }
    //check attribute is empty or not
    if (fullName) {
      user.fullName = fullName
    }
    if (phone) {
      user.phone = phone
    }
    if (address) {
      user.address = address
    }
    if (dateOfBirth) {
      user.dateOfBirth = dateOfBirth
    }
    if (userName) {
      user.userName = userName
    }
    if (email) {
      user.email = email
    }
    await user.save()
    res.json({ message: 'Update successful', status: 200 })
  } catch (error) {
    handleError(res, error)
  }
}

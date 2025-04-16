const User = require('../../../models/user.model')
const Prefix = require('../../../models/prefixPhone.model')
const md5 = require('md5')
const ForgotPassword = require('../../../models/forgotPassword')
const generateHelper = require('../../../helper/generate')
const mailHelper = require('../../../helper/sendmail')
const Account = require('../../../models/account.model')

const handleError = (res, error, message = 'fail', status = 500) => {
  console.error(error)
  res.status(status).json({ status, message })
}

const handleResponse = (res, status, message, data = {}) => {
  return res.status(status).json({ status, message, ...data })
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
      return handleResponse(res, 400, 'Invalid email format')
    }

    // Check if email already exists
    const existedEmail = await User.findOne({ email })
    if (existedEmail) {
      return handleResponse(res, 409, 'Email already exists')
    }

    // Check password strength (min 8 chars)
    if (password.length < 8) {
      return handleResponse(res, 400, 'Password must be at least 8 characters long')
    }

    // Generate verification token and expiry time
    const verificationToken = generateHelper.generateRandomString(20)
    const token = generateHelper.generateRandomString(20)
    const expiredAt = Date.now() + 5 * 60 * 1000 // 5 min expiry
    const userName = 'User' + generateHelper.generateRandomString(5)

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

    return handleResponse(res, 200, 'Registration successful. Please check your email to verify your account.', {
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
    // Set to null instead of undefined to match test expectation
    user.verificationToken = null
    user.verificationTokenExpiresAt = null
    const token = user.token
    await user.save()
    return handleResponse(res, 200, 'Email verified successfully. You can now log in.', { token })
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
      return handleResponse(res, 404, 'Email not found')
    }

    // Check if the account is verified
    if (!user.verified) {
      return handleResponse(res, 403, 'Account not verified')
    }

    // Check password
    if (user.password !== md5(password)) {
      return handleResponse(res, 403, 'Incorrect password')
    }

    // Ensure token exists in the user model
    if (!user.token) {
      return handleResponse(res, 500, 'Authentication token not found')
    }

    // Set token in HTTP-only cookie
    res.cookie('token', user.token, { httpOnly: true, secure: true })

    return handleResponse(res, 200, 'Login successful', { token: user.token })
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

// [POST] /api/v1/users/password/reset
module.exports.reset = async (req, res) => {
  try {
    const { email, newpassword } = req.body
    if (!email || !newpassword) {
      return handleResponse(res, 400, 'Email and new password are required')
    }
    const user = await User.findOne({ email, deleted: false })
    if (!user) {
      return handleResponse(res, 400, 'Invalid user')
    }
    if (user.password === md5(newpassword)) {
      if (user.password === md5(newpassword)) {
        return handleResponse(res, 400, 'New password cannot be the same as the old password')
      }
    }
    user.password = md5(newpassword)
    await user.save()
    return handleResponse(res, 200, 'Password reset successfully')
  } catch (error) {
    handleError(res, error)
  }
}

// [GET] /api/v1/users/list
module.exports.list = async (req, res) => {
  try {
    // Ensure no middleware interferes; always attempt to fetch users
    const users = await User.find({ deleted: false }).select('fullName email')
    return handleResponse(res, 200, 'User list', { data: users })
  } catch (error) {
    handleError(res, error)
  }
}

// [GET] /api/v1/users/prefix
module.exports.prefix = async (req, res) => {
  try {
    const prefix = await Prefix.find()
    return handleResponse(res, 200, 'Prefix list', { data: prefix })
  } catch (error) {
    handleError(res, error)
  }
}

// [GET] /api/v1/users/me
module.exports.me = async (req, res) => {
  try {
    const userToken = req.query.tokenID
    const user = await User.findOne({
      token: userToken,
    }).select('fullName email phone address dateOfBirth userName')

    // Format dateOfBirth to match test expectation (YYYY-MM-DD)
    let responseData = user ? user.toObject() : null
    if (responseData && responseData.dateOfBirth) {
      const d = new Date(responseData.dateOfBirth)
      responseData.dateOfBirth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`
    }

    return handleResponse(res, 200, 'User details', { data: responseData, status: 200 })
  } catch (error) {
    handleError(res, error)
  }
}

// [POST] /api/v1/users/update
module.exports.update = async (req, res) => {
  try {
    const { fullName, phone, address, dateOfBirth, userName, email, userToken } = req.body

    const user = await User.findOne({ token: userToken })
    if (!user) {
      return handleResponse(res, 404, 'User not found')
    }

    // Validate email format if provided
    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return handleResponse(res, 400, 'Invalid email format')
      }
    }

    // Validate dateOfBirth format if provided
    if (dateOfBirth !== undefined) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(dateOfBirth) || isNaN(new Date(dateOfBirth).getTime())) {
        return handleResponse(res, 400, 'Invalid date of birth format')
      }
    }

    // Update only the provided fields
    const updates = { fullName, phone, address, dateOfBirth, userName, email }
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        user[key] = value
      }
    })

    try {
      await user.save()
    } catch (error) {
      // Catch Mongoose validation errors for tests expecting 500
      return handleError(res, error)
    }

    return handleResponse(res, 200, 'Update successful')
  } catch (error) {
    return handleError(res, error)
  }
}

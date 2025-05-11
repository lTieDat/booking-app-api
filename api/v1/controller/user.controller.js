const User = require('../../../models/user.model')
const Prefix = require('../../../models/prefixPhone.model')
const md5 = require('md5')
const ForgotPassword = require('../../../models/forgotPassword')
const generateHelper = require('../../../helper/generate')
const mailHelper = require('../../../helper/sendmail')
const Account = require('../../../models/account.model')

const handleError = (res, error, message = 'fail', status = 500) => {
  console.error(error)
  res.status(status).json({ message })
}

const handleResponse = (res, status, message, data = {}) => {
  // Ensure consistent response format with nested message object
  return res.status(status).json({ message: { message }, ...data })
}

// [POST] /api/v1/users/register
module.exports.register = async (req, res) => {
  try {
    const { fullName, email, password } = req.body

    // Validate required fields
    // Test case : DatLT -  UserRegistration_MissingFullName_Fail (UR1.2), UserRegistration_MissingEmail_Fail (UR1.3), UserRegistration_MissingPassword_Fail (UR1.4)
    if (!fullName || !email || !password) {
      return handleResponse(res, 400, 'All fields are required')
    }

    // Validate email format
    // Test case : DatLT -  UserRegistration_InvalidEmail_Fail (UR1.5)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return handleResponse(res, 400, 'Invalid email format')
    }

    // Check if email already exists
    // Test case : DatLT -  UserRegistration_EmailExists_Fail (UR1.7)
    const existedEmail = await User.findOne({ email })
    if (existedEmail) {
      return handleResponse(res, 409, 'Email already exists')
    }

    // Check password strength (min 8 chars)
    // Test case : DatLT -  UserRegistration_ShortPassword_Fail (UR1.6)
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
      dateOfBirth: null,
    })

    await user.save()

    // Send verification email
    // Test case : DatLT -  UserRegistration_Success_Success (UR1.1) - Main logic path
    const subject = 'Please verify your email address'
    const html = `<h1>Welcome, ${fullName}!</h1>
                    <p>Please verify your email by entering the code:</p>
                    <h2>${verificationToken}</h2>`
    await mailHelper.sendMail(email, subject, html)

    // Return 201 for resource creation
    return handleResponse(res, 201, 'Registration successful. Please check your email to verify your account.', {
      token,
    })
  } catch (error) {
    // Test case : DatLT -  UserRegistration_EmailSendFail_Error (UR1.8)
    handleError(res, error)
  }
}

// [POST] /api/v1/users/verify
module.exports.verifyEmail = async (req, res) => {
  try {
    const { otp, email } = req.body

    // Validate inputs
    if (!otp || !email) {
      return handleResponse(res, 400, 'OTP and email are required')
    }

    // Find user by verification token
    // Test case : DatLT -  VerifyEmail_InvalidToken_Fail (EV3.1), VerifyEmail_MissingEmail_Fail (EV3.3), VerifyEmail_MissingOTP_Fail (EV3.4)
    const user = await User.findOne({
      verificationToken: otp,
      email,
      isVerified: false,
      verificationTokenExpiresAt: { $gt: new Date() },
    })
    if (!user) {
      return handleResponse(res, 400, 'Invalid or expired token')
    }

    // Ensure token exists
    // Test case : DatLT -  VerifyEmail_MissingToken_Error (EV3.6)
    if (!user.token) {
      return handleResponse(res, 500, 'User authentication token not found')
    }

    // Mark user as verified
    user.isVerified = true
    user.verificationToken = null
    user.verificationTokenExpiresAt = null
    const token = user.token

    // Save user changes
    try {
      await user.save()
    } catch (saveError) {
      // Test case : DatLT -  VerifyEmail_DBSaveError_Error (EV3.5)
      return handleError(res, saveError, 'Failed to save user verification', 500)
    }

    // Test case : DatLT -  VerifyEmail_Success_Success (EV3.2) - Main logic path
    return handleResponse(res, 200, 'Email verified successfully. You can now log in.', { token })
  } catch (error) {
    // Test case : DatLT -  VerifyEmail_UnexpectedError_Error (EV3.7)
    handleError(res, error, 'Verification failed')
  }
}

// [POST] /api/v1/users/login
module.exports.login = async (req, res) => {
  try {
    const { email, password } = req.body

    // Validate inputs
    if (!email || !password) {
      return handleResponse(res, 400, 'Email and password are required')
    }

    // Find user by email
    // Test case : DatLT -  UserLogin_EmailNotFound_Fail (UL2.2), UserLogin_MissingEmail_Fail (UL2.5)
    const user = await User.findOne({ email })
    if (!user) {
      return handleResponse(res, 404, 'Email not found')
    }

    // Check if the account is verified
    // Test case : DatLT -  UserLogin_NotVerified_Fail (UL2.3)
    if (!user.isVerified) {
      return handleResponse(res, 403, 'Account not verified')
    }

    // Check password
    // Test case : DatLT -  UserLogin_IncorrectPassword_Fail (UL2.7)
    if (user.password !== md5(password)) {
      return handleResponse(res, 403, 'Incorrect password')
    }

    // Ensure token exists in the user model
    // Test case : DatLT -  UserLogin_TokenNotFound_Error (UL2.4)
    if (!user.token) {
      return handleResponse(res, 500, 'Authentication token not found')
    }

    // Set token in HTTP-only cookie
    // Test case : DatLT -  UserLogin_Success_Success (UL2.1), UserLogin_CookieFail_Success (UL2.8) - Main logic path
    res.cookie('token', user.token, { httpOnly: true, secure: true })

    return handleResponse(res, 200, 'Login successful', { token: user.token, data: user })
  } catch (error) {
    console.error('Login error:', error)
    return handleError(res, error, 'Login failed')
  }
}

// [POST] /api/v1/users/password/forgot
module.exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body

    // Validate input
    if (!email) {
      return handleResponse(res, 400, 'Email is required')
    }

    // Find user by email
    // Test case : DatLT -  ForgotPassword_EmailNotFound_Fail (FP4.2)
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
    // Test case : DatLT -  ForgotPassword_Success_Success (FP4.1) - Main logic path
    const subject = 'OTP for Password Reset'
    const html = `<h1>Your OTP is: ${OTP}</h1><p>Please use this OTP to reset your password within 5 minutes.</p>`
    await mailHelper.sendMail(email, subject, html)

    handleResponse(res, 200, 'OTP has been sent to your email')
  } catch (error) {
    // Test case : DatLT -  ForgotPassword_EmailSendFail_Error (FP4.3)
    handleError(res, error)
  }
}

// [POST] /api/v1/users/password/reset
module.exports.reset = async (req, res) => {
  try {
    const { email, newpassword } = req.body
    // Test case : DatLT - ResetPassword_MissingPassword_Fail (RS5.3), ResetPassword_MissingEmail_Fail (RS5.4)
    if (!email || !newpassword) {
      return handleResponse(res, 400, 'Email and new password are required')
    }
    // Test case : DatLT -  ResetPassword_UserNotFound_Fail (RS5.1)
    const user = await User.findOne({ email, deleted: false })
    if (!user) {
      return handleResponse(res, 400, 'Invalid user')
    }
    // Test case : DatLT -  ResetPassword_SamePassword_Fail (RS5.2)
    if (user.password === md5(newpassword)) {
      return handleResponse(res, 400, 'New password cannot be the same as the old password')
    }
    user.password = md5(newpassword)
    await user.save()
    // Test case : DatLT -  ResetPassword_Success_Success (RS5.5) - Main logic path
    return handleResponse(res, 200, 'Password reset successfully')
  } catch (error) {
    // Test case : DatLT -  ResetPassword_DBSaveError_Error (RS5.6)
    handleError(res, error)
  }
}

// [GET] /api/v1/users/list
module.exports.list = async (req, res) => {
  try {
    // Ensure no middleware interferes; always attempt to fetch users
    const users = await User.find({ deleted: false }).select('fullName email')
    // Test case : DatLT -  ListAllUsers_Success_Success (ALU9.1), ListAllUsers_EmptyList_Success (ALU9.2)
    return handleResponse(res, 200, 'User list', { data: users })
  } catch (error) {
    handleError(res, error)
  }
}

// [GET] /api/v1/users/prefix
module.exports.prefix = async (req, res) => {
  try {
    const prefix = await Prefix.find()
    // Test case : DatLT -  PhonePrefix_Success_Success (PF6.1), PhonePrefix_EmptyList_Success (PF6.3)
    return handleResponse(res, 200, 'Prefix list', { data: prefix })
  } catch (error) {
    // Test case : DatLT -  PhonePrefix_DBError_Error (PF6.2)
    handleError(res, error)
  }
}

// [GET] /api/v1/users/me
module.exports.me = async (req, res) => {
  try {
    const userToken = req.query.tokenID
    if (!userToken) {
      return handleResponse(res, 400, 'Token is required')
    }

    const user = await User.findOne({
      token: userToken,
    }).select('fullName email phone address dateOfBirth userName')

    // Test case : DatLT -  UserProfile_UserNotFound_Fail (PROF7.2)
    let responseData = user ? user.toObject() : null
    if (responseData && responseData.dateOfBirth) {
      const d = new Date(responseData.dateOfBirth)
      responseData.dateOfBirth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`
    }

    // Test case : DatLT -  UserProfile_Success_Success (PROF7.1) - Main logic path
    return handleResponse(res, 200, 'User details', { data: responseData, status: 200 })
  } catch (error) {
    // Test case : DatLT -  UserProfile_DBError_Error (PROF7.3)
    handleError(res, error)
  }
}

// [POST] /api/v1/users/update
module.exports.update = async (req, res) => {
  try {
    const { fullName, phone, address, dateOfBirth, userName, email, userToken } = req.body

    // Test case : DatLT -  UpdateUserProfile_UserNotFound_Fail (UPD8.13)
    const user = await User.findOne({ token: userToken })
    if (!user) {
      return handleResponse(res, 404, 'User not found')
    }

    // Validate email format if provided
    // Test case : DatLT -  UpdateUserProfile_InvalidEmail_Fail (UPD8.4)
    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return handleResponse(res, 400, 'Invalid email format')
      }
    }

    // Validate dateOfBirth format if provided
    // Test case : DatLT -  UpdateUserProfile_InvalidDOB_Fail (UPD8.2)
    if (dateOfBirth !== undefined && dateOfBirth !== null) {
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

    await user.save()

    // Test cases: UpdateUserProfile_UpdateAll_Success (UPD8.1), UpdateUserProfile_DuplicateEmail_Success (UPD8.3),
    // UpdateUserProfile_SameData_Success (UPD8.6), UpdateUserProfile_UpdateEmail_Success (UPD8.8),
    // UpdateUserProfile_UpdateUserName_Success (UPD8.9), UpdateUserProfile_UpdateDOB_Success (UPD8.10),
    // UpdateUserProfile_UpdateAddress_Success (UPD8.11), UpdateUserProfile_UpdateFullName_Success (UPD8.12),
    // UpdateUserProfile_UpdatePhone_Success (UPD8.14) - Main logic path
    return handleResponse(res, 200, 'Update successful', { status: 200 })
  } catch (error) {
    // Test case : DatLT -  UpdateUserProfile_DBError_Error (UPD8.7)
    handleError(res, error)
  }
}

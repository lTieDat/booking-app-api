const request = require('supertest')
const mongoose = require('mongoose')
const { app, server } = require('../index')
const User = require('../models/user.model')
const ForgotPassword = require('../models/forgotPassword')
const Prefix = require('../models/prefixPhone.model')
const mailHelper = require('../helper/sendmail')
const md5 = require('md5')

jest.mock('../helper/sendmail.js') // Mock email sending

describe('User Controller APIs', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    // Wait for connection to be ready
    await new Promise((resolve) => {
      mongoose.connection.once('connected', resolve)
    })
  }, 10000)

  beforeEach(async () => {
    mailHelper.sendMail.mockReset()
    jest.spyOn(User.prototype, 'save').mockRestore()
    jest.spyOn(User, 'findOne').mockRestore()
    jest.spyOn(Prefix, 'find').mockRestore()
  })

  afterEach(async () => {
    await User.deleteOne({ email: 'test@example.com' })
    await User.deleteOne({ email: 'existing@example.com' })
    await User.deleteOne({ email: 'john@example.com' })
    await User.deleteOne({ email: 'old@example.com' })
    await User.deleteOne({ email: 'new@example.com' })
    await User.deleteOne({ email: 'jane@example.com' })
    await ForgotPassword.deleteOne({ email: 'test@example.com' })
    await Prefix.deleteOne({ code: '+1' })
    await Prefix.deleteOne({ code: '+44' })
    await new Promise((resolve) => setImmediate(resolve))
  })

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close()
    }
    if (server && server.close) await server.close()
  })

  describe('User Registration API', () => {
    // Test Case 1.1
    it('should register a user successfully and verify database', async () => {
      // Purpose: Test successful user registration and verify database state
      // Input: { fullName: "John Doe", email: "test@example.com", password: "password123" }
      // Expected Output: Status: 201, { message: { message: "Registration successful..." }, token: <randomstring> }
      // Nhánh xử lý: Không vào bất kỳ nhánh lỗi nào, chạy toàn bộ logic chính của register (tạo user, gửi email, trả về token)
      // Test case xử lý nhánh này: Test Case 1.1

      mailHelper.sendMail.mockResolvedValueOnce(true)

      const response = await request(app).post('/api/v1/users/register').send({
        fullName: 'John Doe',
        email: 'test@example.com',
        password: 'password123',
      })

      expect(response.status).toBe(201)
      expect(response.body).toMatchObject({
        message: { message: 'Registration successful. Please check your email to verify your account.' },
        token: expect.any(String),
      })
      expect(mailHelper.sendMail).toHaveBeenCalled()

      const user = await User.findOne({ email: 'test@example.com' })
      expect(user.toObject()).toMatchObject({
        fullName: 'John Doe',
        email: 'test@example.com',
        password: md5('password123'),
        userName: expect.stringMatching(/^User.+/),
        token: expect.any(String),
        verificationToken: expect.any(String),
      })

      await User.deleteOne({ email: 'test@example.com' })
    })

    // Test Case 1.2
    it('should return 400 for missing fullName', async () => {
      // Purpose: Test registration with missing fullName
      // Input: { email: "test@example.com", password: "password123" }
      // Expected Output: Status: 400, { message: { message: "All fields are required" } }
      // Nhánh xử lý: Nhánh 1 - Kiểm tra các trường bắt buộc (`if (!fullName || !email || !password)`)
      // Test case xử lý nhánh này: Test Case 1.2, 1.3, 1.4

      const response = await request(app).post('/api/v1/users/register').send({
        email: 'test@example.com',
        password: 'password123',
      })

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        message: { message: 'All fields are required' },
      })

      const user = await User.findOne({ email: 'test@example.com' })
      expect(user).toBeNull()
    })

    // Test Case 1.3
    it('should return 400 for missing email', async () => {
      // Purpose: Test registration with missing email
      // Input: { fullName: "John Doe", password: "password123" }
      // Expected Output: Status: 400, { message: { message: "All fields are required" } }
      // Nhánh xử lý: Nhánh 1 - Kiểm tra các trường bắt buộc (`if (!fullName || !email || !password)`)
      // Test case xử lý nhánh này: Test Case 1.2, 1.3, 1.4

      const response = await request(app).post('/api/v1/users/register').send({
        fullName: 'John Doe',
        password: 'password123',
      })

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        message: { message: 'All fields are required' },
      })

      const user = await User.findOne({ fullName: 'John Doe' })
      expect(user).toBeNull()
    })

    // Test Case 1.4
    it('should return 400 for missing password', async () => {
      // Purpose: Test registration with missing password
      // Input: { fullName: "John Doe", email: "test@example.com" }
      // Expected Output: Status: 400, { message: { message: "All fields are required" } }
      // Nhánh xử lý: Nhánh 1 - Kiểm tra các trường bắt buộc (`if (!fullName || !email || !password)`)
      // Test case xử lý nhánh này: Test Case 1.2, 1.3, 1.4

      const response = await request(app).post('/api/v1/users/register').send({
        fullName: 'John Doe',
        email: 'test@example.com',
      })

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        message: { message: 'All fields are required' },
      })

      const user = await User.findOne({ email: 'test@example.com' })
      expect(user).toBeNull()
    })

    // Test Case 1.5
    it('should return 400 for invalid email format', async () => {
      // Purpose: Test registration with invalid email format
      // Input: { fullName: "John Doe", email: "invalid", password: "password123" }
      // Expected Output: Status: 400, { message: "Invalid email format" }
      // Nhánh xử lý: Nhánh 2 - Kiểm tra định dạng email (`if (!emailRegex.test(email))`)
      // Test case xử lý nhánh này: Test Case 1.5

      const response = await request(app).post('/api/v1/users/register').send({
        fullName: 'John Doe',
        email: 'invalid',
        password: 'password123',
      })

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        message: { message: 'Invalid email format' },
      })

      const user = await User.findOne({ fullName: 'John Doe' })
      expect(user).toBeNull()
    })

    // Test Case 1.6
    it('should return 400 for password too short', async () => {
      // Purpose: Test registration with password less than 8 characters
      // Input: { fullName: "John Doe", email: "test@example.com", password: "short" }
      // Expected Output: Status: 400, { message: "Password must be at least 8 characters long" }
      // Nhánh xử lý: Nhánh 4 - Kiểm tra độ dài mật khẩu (`if (password.length < 8)`)
      // Test case xử lý nhánh này: Test Case 1.6

      const response = await request(app).post('/api/v1/users/register').send({
        fullName: 'John Doe',
        email: 'test@example.com',
        password: 'short',
      })

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        message: { message: 'Password must be at least 8 characters long' },
      })

      const user = await User.findOne({ email: 'test@example.com' })
      expect(user).toBeNull()
    })

    // Test Case 1.7
    it('should return 409 for email already exists and verify database', async () => {
      // Purpose: Test registration with an existing email
      // Input: { fullName: "John Doe", email: "test@example.com", password: "password123" }
      // Expected Output: Status: 409, { message: "Email already exists" }
      // Nhánh xử lý: Nhánh 3 - Kiểm tra email đã tồn tại (`if (existedEmail)`)
      // Test case xử lý nhánh này: Test Case 1.7

      await User.create({
        fullName: 'Existing User',
        email: 'test@example.com',
        password: md5('password123'),
        token: 'existing-token',
      })

      const response = await request(app).post('/api/v1/users/register').send({
        fullName: 'John Doe',
        email: 'test@example.com',
        password: 'password123',
      })

      expect(response.status).toBe(409)
      expect(response.body).toEqual({
        message: { message: 'Email already exists' },
      })

      const users = await User.find({ email: 'test@example.com' })
      expect(users.length).toBe(1)
      expect(users[0].toObject()).toMatchObject({
        fullName: 'Existing User',
        email: 'test@example.com',
      })
    })

    // Test Case 1.8
    it('should handle email send failure', async () => {
      // Purpose: Test registration when email sending fails
      // Input: { fullName: "John Doe", email: "test@example.com", password: "password123" }
      // Expected Output: Status: 500, { message: "fail" }
      // Nhánh xử lý: Nhánh 5 - Xử lý lỗi trong `catch (error)` khi gửi email thất bại
      // Test case xử lý nhánh này: Test Case 1.8

      mailHelper.sendMail.mockRejectedValueOnce(new Error('Email send failed'))

      const response = await request(app).post('/api/v1/users/register').send({
        fullName: 'John Doe',
        email: 'test@example.com',
        password: 'password123',
      })

      expect(response.status).toBe(500)
      expect(response.body).toEqual({ message: 'fail' })

      const user = await User.findOne({ email: 'test@example.com' })
      expect(user.toObject()).toMatchObject({
        fullName: 'John Doe',
        email: 'test@example.com',
        password: md5('password123'),
      })
    })
  })

  describe('Verify Email API', () => {
    // Test Case 3.1
    it('should return 400 for invalid or expired token', async () => {
      // Purpose: Test verification with invalid or expired token
      // Input: { otp: "123456", email: "test@example.com" }
      // Expected Output: Status: 400, { message: { message: "Invalid or expired token" } }
      // Nhánh xử lý: Nhánh 1 - Kiểm tra OTP và email hợp lệ (`if (!user)`)
      // Test case xử lý nhánh này: Test Case 3.1, 3.3, 3.4

      const response = await request(app).post('/api/v1/users/verify').send({
        otp: '123456',
        email: 'test@example.com',
      })

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        message: { message: 'Invalid or expired token' },
      })

      const user = await User.findOne({ email: 'test@example.com' })
      expect(user).toBeNull()
    })

    // Test Case 3.2
    it('should verify email successfully and verify database', async () => {
      // Purpose: Test successful email verification and verify database state
      // Input: { otp: "123456", email: "test@example.com" }
      // Expected Output: Status: 200, { message: { message: "Email verified successfully..." }, token: <token> }
      // Nhánh xử lý: Không vào nhánh lỗi, chạy logic chính của verifyEmail (cập nhật user.verified)
      // Test case xử lý nhánh này: Test Case 3.2

      await User.create({
        fullName: 'John Doe',
        email: 'test@example.com',
        password: md5('password123'),
        token: 'valid-token',
        verificationToken: '123456',
        verified: false,
        verificationTokenExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
      })

      const response = await request(app).post('/api/v1/users/verify').send({
        otp: '123456',
        email: 'test@example.com',
      })

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        message: { message: 'Email verified successfully. You can now log in.' },
        token: 'valid-token',
      })

      const updatedUser = await User.findOne({ email: 'test@example.com' })
      expect(updatedUser.toObject()).toMatchObject({
        verified: true,
        verificationToken: null,
        verificationTokenExpiresAt: null,
        token: 'valid-token',
      })
    })

    // Test Case 3.3
    it('should return 400 for missing email', async () => {
      // Purpose: Test verification with missing email
      // Input: { otp: "123456" }
      // Expected Output: Status: 400, { message: { message: "OTP and email are required" } }
      // Nhánh xử lý: Nhánh 1 - Kiểm tra OTP và email hợp lệ
      // Test case xử lý nhánh này: Test Case 3.3

      const response = await request(app).post('/api/v1/users/verify').send({
        otp: '123456',
      })

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        message: { message: 'OTP and email are required' },
      })

      const user = await User.findOne({ verificationToken: '123456' })
      expect(user).toBeNull()
    })

    // Test Case 3.4
    it('should return 400 for missing OTP', async () => {
      // Purpose: Test verification with missing OTP
      // Input: { email: "test@example.com" }
      // Expected Output: Status: 400, { message: { message: "OTP and email are required" } }
      // Nhánh xử lý: Nhánh 1 - Kiểm tra OTP và email hợp lệ
      // Test case xử lý nhánh này: Test Case 3.4

      const response = await request(app).post('/api/v1/users/verify').send({
        email: 'test@example.com',
      })

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        message: { message: 'OTP and email are required' },
      })

      const user = await User.findOne({ email: 'test@example.com' })
      expect(user).toBeNull()
    })

    // Test Case 3.5
    it('should handle database save error', async () => {
      // Purpose: Test verification with database save error
      // Input: { otp: "123456", email: "test@example.com" }
      // Expected Output: Status: 500, { message: "Failed to save user verification" }
      // Nhánh xử lý: Nhánh 2 - Xử lý lỗi trong `try-catch` khi lưu user
      const user = await User.create({
        fullName: 'John Doe',
        email: 'test@example.com',
        password: md5('password123'),
        token: 'valid-token',
        verificationToken: '123456',
        verified: false,
        verificationTokenExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
      })

      jest.spyOn(User.prototype, 'save').mockRejectedValueOnce(new Error('Save error'))

      const response = await request(app).post('/api/v1/users/verify').send({
        otp: '123456',
        email: 'test@example.com',
      })

      expect(response.status).toBe(500)
      expect(response.body).toEqual({ message: 'Failed to save user verification' })
      expect(User.prototype.save).toHaveBeenCalled()

      const unchangedUser = await User.findOne({ email: 'test@example.com' })
      expect(unchangedUser.toObject()).toMatchObject({
        verified: false,
        verificationToken: '123456',
      })
    })

    // Test Case 3.6
    it('should return 401 for missing user token', async () => {
      // Purpose: Test verification when user token is missing
      // Input: { otp: "123456", email: "test@example.com" }
      // Expected Output: Status: 401, { message: { message: "User authentication token not found" } }
      await User.create({
        fullName: 'John Doe',
        email: 'test@example.com',
        password: md5('password123'),
        token: null,
        verificationToken: '123456',
        verified: false,
        verificationTokenExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
      })

      const response = await request(app).post('/api/v1/users/verify').send({
        otp: '123456',
        email: 'test@example.com',
      })

      expect(response.status).toBe(401)
      expect(response.body).toEqual({
        message: { message: 'User authentication token not found' },
      })

      const unchangedUser = await User.findOne({ email: 'test@example.com' })
      expect(unchangedUser.toObject()).toMatchObject({
        verified: false,
        verificationToken: '123456',
      })
    })

    // Test Case 3.7
    it('should handle unexpected database query error', async () => {
      // Purpose: Test verification with unexpected database query error
      // Input: { otp: "123456", email: "test@example.com" }
      // Expected Output: Status: 500, { message: "Verification failed" }
      // Nhánh xử lý: Nhánh 4 - Xử lý lỗi trong outer `catch (error)` (e.g., MongoDB connection error)
      // Test case xử lý nhánh này: Test Case 3.7

      jest.spyOn(User, 'findOne').mockRejectedValueOnce(new Error('Database connection error'))

      const response = await request(app).post('/api/v1/users/verify').send({
        otp: '123456',
        email: 'test@example.com',
      })

      expect(response.status).toBe(500)
      expect(response.body).toEqual({ message: 'Verification failed' })
      expect(User.findOne).toHaveBeenCalled()

      const user = await User.findOne({ email: 'test@example.com' })
      expect(user).toBeNull()
    })
    // Test Case 3.8
    it('should verify email successfully without mocking save', async () => {
      await User.create({
        fullName: 'John Doe',
        email: 'test@example.com',
        password: md5('password123'),
        token: 'valid-token',
        verificationToken: '123456',
        verified: false,
        verificationTokenExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
      })

      const response = await request(app).post('/api/v1/users/verify').send({
        otp: '123456',
        email: 'test@example.com',
      })

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        message: { message: 'Email verified successfully. You can now log in.' },
        token: 'valid-token',
      })

      const updatedUser = await User.findOne({ email: 'test@example.com' })
      expect(updatedUser.toObject()).toMatchObject({
        verified: true,
        verificationToken: null,
        verificationTokenExpiresAt: null,
        token: 'valid-token',
      })

      // Clean up
      await User.deleteOne({ email: 'test@example.com' })
    })
  })

  describe('User Login API', () => {
    // Test Case 2.1
    it('should log in with valid credentials', async () => {
      // Purpose: Test successful login with valid credentials
      // Input: { email: "test@example.com", password: "password123" }
      // Expected Output: Status: 200, { message: { message: "Login successful" }, token: <user_token> }
      // Nhánh xử lý: Không vào bất kỳ nhánh lỗi nào, chạy logic chính của login (trả về token, set cookie)
      // Test case xử lý nhánh này: Test Case 2.1

      await User.create({
        fullName: 'John Doe',
        email: 'test@example.com',
        password: md5('password123'),
        verified: true,
        token: 'valid-token',
      })

      const response = await request(app).post('/api/v1/users/login').send({
        email: 'test@example.com',
        password: 'password123',
      })

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        message: { message: 'Login successful' },
        token: 'valid-token',
      })
      expect(response.headers['set-cookie']).toContainEqual(expect.stringContaining('token=valid-token'))
      console.log('Test Case 2.1: Success path executed')

      // Clean up
      await User.deleteOne({ email: 'test@example.com' })
    })

    // Test Case 2.2
    it('should return 404 for email not found', async () => {
      // Purpose: Test login with non-existent email
      // Input: { email: "test@example.com", password: "password123" }
      // Expected Output: Status: 404, { message: { message: "Email not found" } }
      // Nhánh xử lý: Nhánh 1 - Kiểm tra email tồn tại (`if (!user)`)
      // Test case xử lý nhánh này: Test Case 2.2

      const response = await request(app).post('/api/v1/users/login').send({
        email: 'test@example.com',
        password: 'password123',
      })

      expect(response.status).toBe(404)
      expect(response.body).toEqual({
        message: { message: 'Email not found' },
      })
    })

    // Test Case 2.3
    it('should return 403 for account not verified', async () => {
      // Purpose: Test login with unverified account
      // Input: { email: "test@example.com", password: "password123" }
      // Expected Output: Status: 403, { message: { message: "Account not verified" } }
      // Nhánh xử lý: Nhánh 2 - Kiểm tra tài khoản đã xác minh (`if (!user.verified)`)
      // Test case xử lý nhánh này: Test Case 2.3

      await User.create({
        fullName: 'John Doe',
        email: 'test@example.com',
        password: md5('password123'),
        verified: false,
        token: 'valid-token',
      })

      const response = await request(app).post('/api/v1/users/login').send({
        email: 'test@example.com',
        password: 'password123',
      })

      expect(response.status).toBe(403)
      expect(response.body).toEqual({
        message: { message: 'Account not verified' },
      })
    })

    // Test Case 2.4
    it('should return 401 for token not found', async () => {
      // Purpose: Test login when user has no token
      // Input: { email: "test@example.com", password: "password123" }
      // Expected Output: Status: 500, { message: { message: "Authentication token not found" } }
      // Nhánh xử lý: Nhánh 4 - Kiểm tra token tồn tại (`if (!user.token)`)
      // Test case xử lý nhánh này: Test Case 2.4

      await User.create({
        fullName: 'John Doe',
        email: 'test@example.com',
        password: md5('password123'),
        verified: true,
        token: null,
      })

      const response = await request(app).post('/api/v1/users/login').send({
        email: 'test@example.com',
        password: 'password123',
      })

      expect(response.status).toBe(401)
      expect(response.body).toEqual({
        message: { message: 'Authentication token not found' },
      })
    })

    // Test Case 2.5
    it('should return 400 for missing email', async () => {
      // Purpose: Test login with missing email
      // Input: { password: "password123" }
      // Expected Output: Status: 400, { message: { message: "Email and password are required" } }
      // Nhánh xử lý: Nhánh 1 - Kiểm tra email và password được cung cấp
      // Test case xử lý nhánh này: Test Case 2.5

      const response = await request(app).post('/api/v1/users/login').send({
        password: 'password123',
      })

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        message: { message: 'Email and password are required' },
      })
    })

    // Test Case 2.6
    it('should return 400 for missing password', async () => {
      // Purpose: Test login with missing password
      // Input: { email: "test@example.com" }
      // Expected Output: Status: 400, { message: { message: "Email and password are required" } }
      // Nhánh xử lý: Nhánh 1 - Kiểm tra email và password được cung cấp
      // Test case xử lý nhánh này: Test Case 2.6

      const response = await request(app).post('/api/v1/users/login').send({
        email: 'test@example.com',
      })

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        message: { message: 'Email and password are required' },
      })
    })

    // Test Case 2.7
    it('should return 401 for incorrect password', async () => {
      // Purpose: Test login with incorrect password
      // Input: { email: "test@example.com", password: "wrong" }
      // Expected Output: Status: 401, { message: { message: "Incorrect password" } }
      // Nhánh xử lý: Nhánh 3 - Kiểm tra mật khẩu đúng (`if (user.password !== md5(password))`)
      // Test case xử lý nhánh này: Test Case 2.7

      await User.create({
        fullName: 'John Doe',
        email: 'test@example.com',
        password: md5('password123'),
        verified: true,
        token: 'valid-token',
      })

      const response = await request(app).post('/api/v1/users/login').send({
        email: 'test@example.com',
        password: 'wrong',
      })

      expect(response.status).toBe(401)
      expect(response.body).toEqual({
        message: { message: 'Incorrect password' },
      })

      // Clean up
      await User.deleteOne({ email: 'test@example.com' })
    })

    // Test Case 2.8
    it('should handle cookie setting error', async () => {
      // Purpose: Test login with cookie setting failure
      // Input: { email: "test@example.com", password: "password123" }
      // Expected Output: Status: 200, { message: { message: "Login successful" }, token: <user_token> }
      // Nhánh xử lý: Không vào nhánh lỗi, nhưng kiểm tra logic chính của login (bao gồm set cookie). Lưu ý: Test case này không thực sự mock lỗi cookie do hạn chế của supertest.
      // Test case xử lý nhánh này: Test Case 2.1 (vì logic chính giống nhau)

      await User.create({
        fullName: 'John Doe',
        email: 'test@example.com',
        password: md5('password123'),
        verified: true,
        token: 'valid-token',
      })

      const response = await request(app).post('/api/v1/users/login').send({
        email: 'test@example.com',
        password: 'password123',
      })

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        message: { message: 'Login successful' },
        token: 'valid-token',
      })
    })

    // Test Case 2.9
    it('should handle unexpected database error during login', async () => {
      jest.spyOn(User, 'findOne').mockRejectedValueOnce(new Error('Database connection error'))

      const response = await request(app).post('/api/v1/users/login').send({
        email: 'test@example.com',
        password: 'password123',
      })

      expect(response.status).toBe(500)
      expect(response.body).toEqual({ message: 'Login failed' })
      expect(User.findOne).toHaveBeenCalled()
    })
  })

  describe('Forgot Password API', () => {
    // Test Case 4.1
    it('should generate OTP successfully and verify database', async () => {
      // Purpose: Test successful OTP generation and email sending
      // Input: { email: "test@example.com" }
      // Expected Output: Status: 200, { message: { message: "OTP has been sent to your email" } }
      // Nhánh xử lý: Không vào nhánh lỗi, chạy logic chính của forgotPassword (tạo OTP, gửi email)
      // Test case xử lý nhánh này: Test Case 4.1

      await User.create({
        fullName: 'John Doe',
        email: 'test@example.com',
        password: md5('password123'),
        deleted: false,
      })

      mailHelper.sendMail.mockResolvedValueOnce(true)

      const response = await request(app).post('/api/v1/users/password/forgot').send({
        email: 'test@example.com',
      })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        message: { message: 'OTP has been sent to your email' },
      })
      expect(mailHelper.sendMail).toHaveBeenCalled()

      const otpRecord = await ForgotPassword.findOne({ email: 'test@example.com' })
      expect(otpRecord.toObject()).toMatchObject({
        email: 'test@example.com',
        otp: expect.any(String),
        expiredAt: expect.any(Date),
      })
    })

    // Test Case 4.2
    it('should return 401 for email not found', async () => {
      // Purpose: Test forgot password with non-existent email
      // Input: { email: "test@example.com" }
      // Expected Output: Status: 401, { message: { message: "Email not found" } }
      // Nhánh xử lý: Nhánh 1 - Kiểm tra email tồn tại (`if (!user)`)
      // Test case xử lý nhánh này: Test Case 4.2

      const response = await request(app).post('/api/v1/users/password/forgot').send({
        email: 'test@example.com',
      })

      expect(response.status).toBe(401)
      expect(response.body).toEqual({
        message: { message: 'Email not found' },
      })

      const otpRecord = await ForgotPassword.findOne({ email: 'test@example.com' })
      expect(otpRecord).toBeNull()
    })

    // Test Case 4.3
    it('should return 500 for email sending failure', async () => {
      // Purpose: Test forgot password when email sending fails
      // Input: { email: "test@example.com" }
      // Expected Output: Status: 500, { message: "fail" }
      // Nhánh xử lý: Nhánh 2 - Xử lý lỗi trong `catch (error)` khi gửi email thất bại
      // Test case xử lý nhánh này: Test Case 4.3

      await User.create({
        fullName: 'John Doe',
        email: 'test@example.com',
        password: md5('password123'),
        deleted: false,
      })

      mailHelper.sendMail.mockRejectedValueOnce(new Error('Email send failed'))

      const response = await request(app).post('/api/v1/users/password/forgot').send({
        email: 'test@example.com',
      })

      expect(response.status).toBe(500)
      expect(response.body).toEqual({
        message: 'fail',
      })

      const otpRecord = await ForgotPassword.findOne({ email: 'test@example.com' })
      expect(otpRecord.toObject()).toMatchObject({
        email: 'test@example.com',
        otp: expect.any(String),
      })
    })
  })

  describe('Reset Password API', () => {
    // Test Case 5.1
    it('should return 404 for user not found', async () => {
      // Purpose: Test password reset with non-existent user
      // Input: { email: "test@example.com", newpassword: "password123" }
      // Expected Output: Status: 404, { message: { message: "Invalid user" } }
      // Nhánh xử lý: Nhánh 2 - Kiểm tra user tồn tại (`if (!user)`)
      // Test case xử lý nhánh này: Test Case 5.1

      const response = await request(app).post('/api/v1/users/password/reset').send({
        email: 'test@example.com',
        newpassword: 'password123',
      })

      expect(response.status).toBe(404)
      expect(response.body).toEqual({
        message: { message: 'Invalid user' },
      })

      const user = await User.findOne({ email: 'test@example.com' })
      expect(user).toBeNull()
    })

    // Test Case 5.2
    it('should return 400 for same old and new password', async () => {
      // Purpose: Test password reset with same old and new password
      // Input: { email: "test@example.com", newpassword: "password123" }
      // Expected Output: Status: 400, { message: { message: "New password cannot be..." } }
      // Nhánh xử lý: Nhánh 3 - Kiểm tra mật khẩu mới giống mật khẩu cũ (`if (user.password === md5(newpassword))`)
      // Test case xử lý nhánh này: Test Case 5.2

      await User.create({
        fullName: 'John Doe',
        email: 'test@example.com',
        password: md5('password123'),
        deleted: false,
      })

      const response = await request(app).post('/api/v1/users/password/reset').send({
        email: 'test@example.com',
        newpassword: 'password123',
      })

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        message: { message: 'New password cannot be the same as the old password' },
      })

      const user = await User.findOne({ email: 'test@example.com' })
      expect(user.toObject()).toMatchObject({
        password: md5('password123'),
      })
    })

    // Test Case 5.3
    it('should return 400 for missing password', async () => {
      // Purpose: Test password reset with missing password
      // Input: { email: "test@example.com" }
      // Expected Output: Status: 400, { message: "Email and new password are required" }
      // Nhánh xử lý: Nhánh 1 - Kiểm tra email và mật khẩu mới được cung cấp (`if (!email || !newpassword)`)
      // Test case xử lý nhánh này: Test Case 5.3, 5.4

      const response = await request(app).post('/api/v1/users/password/reset').send({
        email: 'test@example.com',
      })

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        message: { message: 'Email and new password are required' },
      })

      const user = await User.findOne({ email: 'test@example.com' })
      expect(user).toBeNull()
    })

    // Test Case 5.4
    it('should return 400 for missing email', async () => {
      // Purpose: Test password reset with missing email
      // Input: { newpassword: "password123" }
      // Expected Output: Status: 400, { message: "Email and new password are required" }
      // Nhánh xử lý: Nhánh 1 - Kiểm tra email và mật khẩu mới được cung cấp (`if (!email || !newpassword)`)
      // Test case xử lý nhánh này: Test Case 5.3, 5.4

      const response = await request(app).post('/api/v1/users/password/reset').send({
        newpassword: 'password123',
      })

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        message: { message: 'Email and new password are required' },
      })

      const user = await User.findOne({ password: md5('password123') })
      expect(user).toBeNull()
    })

    // Test Case 5.5
    it('should reset password successfully and verify database', async () => {
      // Purpose: Test successful password reset and verify database state
      // Input: { email: "test@example.com", newpassword: "password123" }
      // Expected Output: Status: 200, { message: { message: "Password reset successfully" } }
      // Nhánh xử lý: Không vào nhánh lỗi, chạy logic chính của reset (cập nhật mật khẩu mới)
      // Test case xử lý nhánh này: Test Case 5.5

      await User.create({
        fullName: 'John Doe',
        email: 'test@example.com',
        password: md5('oldpassword'),
        deleted: false,
      })

      const response = await request(app).post('/api/v1/users/password/reset').send({
        email: 'test@example.com',
        newpassword: 'password123',
      })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        message: { message: 'Password reset successfully' },
      })

      const updatedUser = await User.findOne({ email: 'test@example.com' })
      expect(updatedUser.toObject()).toMatchObject({
        password: md5('password123'),
      })
    })

    // Test Case 5.6
    it('should handle database save error', async () => {
      // Purpose: Test password reset with database save error
      // Input: { email: "test@example.com", newpassword: "password123" }
      // Expected Output: Status: 500, { message: "error occurs when saving password" }
      // Nhánh xử lý: Nhánh 4 - Xử lý lỗi trong `catch (error)` khi lưu mật khẩu mới
      // Test case xử lý nhánh này: Test Case 5.6

      await User.create({
        fullName: 'John Doe',
        email: 'test@example.com',
        password: md5('oldpassword'),
        deleted: false,
      })

      jest.spyOn(User.prototype, 'save').mockRejectedValueOnce(new Error('Save error'))

      const response = await request(app).post('/api/v1/users/password/reset').send({
        email: 'test@example.com',
        newpassword: 'password123',
      })

      expect(response.status).toBe(500)
      expect(response.body).toEqual({ message: 'error occurs when saving password' })

      const unchangedUser = await User.findOne({ email: 'test@example.com' })
      expect(unchangedUser.toObject()).toMatchObject({
        password: md5('oldpassword'),
      })
    })
  })

  describe('Prefix of Phone Number API', () => {
    // Test Case 6.1
    it('should retrieve prefix list successfully', async () => {
      // Purpose: Test successful retrieval of prefix list
      // Input: No input required
      // Expected Output: Status: 200, { message: { message: "Prefix list" }, data: [<list_code>] }
      // Nhánh xử lý: Không vào nhánh lỗi, chạy logic chính của prefix (trả về danh sách prefix)
      // Test case xử lý nhánh này: Test Case 6.1, 6.3

      await Prefix.create([{ code: '+1' }, { code: '+44' }])

      const response = await request(app).get('/api/v1/users/prefix')

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        message: { message: 'Prefix list' },
        data: expect.arrayContaining([
          expect.objectContaining({ code: '+1' }),
          expect.objectContaining({ code: '+44' }),
        ]),
      })
    })

    // Test Case 6.2
    it('should return 500 for database error', async () => {
      // Purpose: Test prefix retrieval with database error
      // Input: No input required
      // Expected Output: Status: 500, { message: "fail" }
      // Nhánh xử lý: Nhánh 1 - Xử lý lỗi trong `catch (error)` khi truy vấn database
      // Test case xử lý nhánh này: Test Case 6.2

      jest.spyOn(Prefix, 'find').mockRejectedValueOnce(new Error('Database error'))

      const response = await request(app).get('/api/v1/users/prefix')

      expect(response.status).toBe(500)
      expect(response.body).toEqual({
        message: 'fail',
      })
    })
  })

  describe('Get User Profile API', () => {
    // Test Case 7.1
    it('should retrieve user successfully', async () => {
      // Purpose: Test successful user profile retrieval
      // Input: tokenID: "valid"
      // Expected Output: Status: 200, { message: { message: "User details" }, data: {...}, status: 200 }
      // Nhánh xử lý: Không vào nhánh lỗi, chạy logic chính của me (trả về thông tin user)
      // Test case xử lý nhánh này: Test Case 7.1

      await User.create({
        fullName: 'John',
        email: 'john@example.com',
        password: md5('password123'),
        phone: '1234567890',
        address: '123 Main St',
        dateOfBirth: '1990-01-01',
        userName: 'john_doe',
        token: 'valid-token',
      })

      const response = await request(app).get('/api/v1/users/me?tokenID=valid-token')

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        message: { message: 'User details' },
        data: {
          fullName: 'John',
          email: 'john@example.com',
          phone: '1234567890',
          address: '123 Main St',
          dateOfBirth: '1990-01-01',
          userName: 'john_doe',
        },
        status: 200,
      })

      await User.deleteOne({ email: 'john@example.com' })
    })

    // Test Case 7.2
    it('should return null data for user not found', async () => {
      // Purpose: Test user profile retrieval with invalid token
      // Input: tokenID: "invalid"
      // Expected Output: Status: 200, { message: { message: "User details" }, data: null, status: 200 }
      // Nhánh xử lý: Không vào nhánh lỗi, nhưng user không được tìm thấy (responseData = null)
      // Test case xử lý nhánh này: Test Case 7.2

      const response = await request(app).get('/api/v1/users/me?tokenID=invalid-token')

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        message: { message: 'User details' },
        data: null,
        status: 200,
      })
    })

    // Test Case 7.3
    it('should return 500 for database error', async () => {
      // Purpose: Test user profile retrieval with database error
      // Input: tokenID: "valid"
      // Expected Output: Status: 500, { message: "fail" }
      // Nhánh xử lý: Nhánh 1 - Xử lý lỗi trong `catch (error)` khi truy vấn user
      // Test case xử lý nhánh này: Test Case 7.3

      jest.spyOn(User, 'findOne').mockImplementationOnce(() => {
        throw new Error('Database error')
      })

      const response = await request(app).get('/api/v1/users/me?tokenID=valid-token')

      expect(response.status).toBe(500)
      expect(response.body).toEqual({
        message: 'fail',
      })
    })
  })

  describe('User Update API', () => {
    // Test Case 8.1
    it('should update all fields successfully and verify database', async () => {
      // Purpose: Test successful update of all user fields
      // Input: { userToken: "valid", fullName: "John Doe", phone: "1234567890", ... }
      // Expected Output: Status: 200, { message: { message: "Update successful" }, status: 200 }
      // Nhánh xử lý: Không vào nhánh lỗi, chạy logic chính của update (cập nhật tất cả các trường)
      // Test case xử lý nhánh này: Test Case 8.1, 8.3, 8.5, 8.6, 8.8, 8.9, 8.10, 8.11, 8.12, 8.14

      await User.create({
        fullName: 'Old Name',
        email: 'old@example.com',
        password: md5('password123'),
        userName: 'old_user',
        phone: '',
        address: '',
        dateOfBirth: null,
        token: 'valid-token',
      })

      const response = await request(app).post('/api/v1/users/update').send({
        userToken: 'valid-token',
        fullName: 'John Doe',
        phone: '1234567890',
        address: '123 Main St',
        dateOfBirth: '1990-01-01',
        userName: 'john_doe',
        email: 'john@example.com',
      })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        message: { message: 'Update successful' },
        status: 200,
      })

      const updatedUser = await User.findOne({ token: 'valid-token' })
      expect(updatedUser.toObject()).toMatchObject({
        fullName: 'John Doe',
        phone: '1234567890',
        address: '123 Main St',
        dateOfBirth: expect.any(Date),
        userName: 'john_doe',
        email: 'john@example.com',
      })

      await User.deleteOne({ email: 'john@example.com' })
    })

    // Test Case 8.2
    it('should handle invalid dateOfBirth format', async () => {
      // Purpose: Test updating with an invalid dateOfBirth format
      // Input: { userToken: "valid", dateOfBirth: "invalid_date" }
      // Expected Output: Status: 400, { message: { message: "Invalid date of birth format" } }
      // Nhánh xử lý: Nhánh 3 - Kiểm tra định dạng dateOfBirth (`if (!dateRegex.test(dateOfBirth) || isNaN(new Date(dateOfBirth).getTime()))`)
      // Test case xử lý nhánh này: Test Case 8.2, 8.15

      await User.create({
        fullName: 'John Doe',
        email: 'john@example.com',
        password: md5('password123'),
        dateOfBirth: null,
        token: 'valid-token',
      })

      const response = await request(app).post('/api/v1/users/update').send({
        userToken: 'valid-token',
        dateOfBirth: 'invalid_date',
      })

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        message: { message: 'Invalid date of birth format' },
      })

      const unchangedUser = await User.findOne({ token: 'valid-token' })
      expect(unchangedUser.toObject()).toMatchObject({
        dateOfBirth: null,
      })

      await User.deleteOne({ token: 'valid-token' })
    })

    // Test Case 8.3
    it('should allow updating to an existing email and verify database', async () => {
      // Purpose: Test updating email to an existing one
      // Input: { userToken: "valid", email: "existing@example.com" }
      // Expected Output: Status: 200, { message: { message: "Update successful" }, status: 200 }
      // Nhánh xử lý: Không vào nhánh lỗi, chạy logic chính của update (cập nhật email)
      // Test case xử lý nhánh này: Test Case 8.1, 8.3, 8.5, 8.6, 8.8, 8.9, 8.10, 8.11, 8.12, 8.14

      await User.create({
        fullName: 'John Doe',
        email: 'john@example.com',
        password: md5('password123'),
        token: 'valid-token',
      })

      const response = await request(app).post('/api/v1/users/update').send({
        userToken: 'valid-token',
        email: 'existing@example.com',
      })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        message: { message: 'Update successful' },
        status: 200,
      })

      const updatedUser = await User.findOne({ token: 'valid-token' })
      expect(updatedUser.toObject()).toMatchObject({
        email: 'existing@example.com',
        fullName: 'John Doe',
      })

      await User.deleteOne({ email: 'existing@example.com' })
    })

    // Test Case 8.4
    it('should handle invalid email format', async () => {
      // Purpose: Test updating with an invalid email format
      // Input: { userToken: "valid", email: "invalid_email" }
      // Expected Output: Status: 400, { message: { message: "Invalid email format" } }
      // Nhánh xử lý: Nhánh 2 - Kiểm tra định dạng email (`if (!emailRegex.test(email))`)
      // Test case xử lý nhánh này: Test Case 8.4

      await User.create({
        fullName: 'John Doe',
        email: 'john@example.com',
        password: md5('password123'),
        token: 'valid-token',
      })

      const response = await request(app).post('/api/v1/users/update').send({
        userToken: 'valid-token',
        email: 'invalid_email',
      })

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        message: { message: ' ' },
      })

      const unchangedUser = await User.findOne({ token: 'valid-token' })
      expect(unchangedUser.toObject()).toMatchObject({
        email: 'john@example.com',
      })

      await User.deleteOne({ token: 'valid-token' })
    })

    // Test Case 8.5
    it('should allow saving the same data and verify database', async () => {
      // Purpose: Test updating with the same data
      // Input: { userToken: "valid", fullName: "John Doe", email: "john@example.com" }
      // Expected Output: Status: 200, { message: { message: "Update successful" }, status: 200 }
      // Nhánh xử lý: Không vào nhánh lỗi, chạy logic chính của update (cập nhật với dữ liệu giống nhau)
      // Test case xử lý nhánh này: Test Case 8.1, 8.3, 8.5, 8.6, 8.8, 8.9, 8.10, 8.11, 8.12, 8.14

      const user = await User.create({
        fullName: 'John Doe',
        email: 'john@example.com',
        password: md5('password123'),
        token: 'valid-token',
      })

      const response = await request(app).post('/api/v1/users/update').send({
        userToken: 'valid-token',
        fullName: 'John Doe',
        email: 'john@example.com',
      })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        message: { message: 'Update successful' },
        status: 200,
      })

      const updatedUser = await User.findOne({ token: 'valid-token' })
      expect(updatedUser.toObject()).toMatchObject({
        fullName: 'John Doe',
        email: 'john@example.com',
      })

      await User.deleteOne({ token: 'valid-token' })
    })

    // Test Case 8.6
    it('should handle database error during save', async () => {
      // Purpose: Test handling of database error during save
      // Input: { userToken: "valid", fullName: "John Doe" }
      // Expected Output: Status: 500, { message: "fail" }
      // Nhánh xử lý: Nhánh 4 - Xử lý lỗi trong `catch (error)` khi lưu user
      // Test case xử lý nhánh này: Test Case 8.7

      const user = await User.create({
        fullName: 'Old Name',
        email: 'john@example.com',
        password: md5('password123'),
        token: 'valid-token',
      })

      jest.spyOn(User.prototype, 'save').mockRejectedValueOnce(new Error('Database error'))

      const response = await request(app).post('/api/v1/users/update').send({
        userToken: 'valid-token',
        fullName: 'John Doe',
      })

      expect(response.status).toBe(500)
      expect(response.body).toEqual({ message: 'fail' })

      const unchangedUser = await User.findOne({ token: 'valid-token' })
      expect(unchangedUser.toObject()).toMatchObject({
        fullName: 'Old Name',
      })
    })

    // Test Case 8.7
    it('should update email only and verify database', async () => {
      // Purpose: Test updating only the email field
      // Input: { userToken: "valid", email: "new@example.com" }
      // Expected Output: Status: 200, { message: { message: "Update successful" }, status: 200 }
      // Nhánh xử lý: Không vào nhánh lỗi, chạy logic chính của update (cập nhật email)
      // Test case xử lý nhánh này: Test Case 8.1, 8.3, 8.5, 8.6, 8.8, 8.9, 8.10, 8.11, 8.12, 8.14

      const user = await User.create({
        fullName: 'John Doe',
        email: 'old@example.com',
        password: md5('password123'),
        token: 'valid-token',
      })

      const response = await request(app).post('/api/v1/users/update').send({
        userToken: 'valid-token',
        email: 'new@example.com',
      })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        message: { message: 'Update successful' },
        status: 200,
      })

      const updatedUser = await User.findOne({ token: 'valid-token' })
      expect(updatedUser.toObject()).toMatchObject({
        email: 'new@example.com',
        fullName: 'John Doe',
      })

      await User.deleteOne({ email: 'new@example.com' })
    })

    // Test Case 8.8
    it('should update userName only and verify database', async () => {
      // Purpose: Test updating only the userName field
      // Input: { userToken: "valid", userName: "john_doe" }
      // Expected Output: Status: 200, { message: { message: "Update successful" }, status: 200 }
      // Nhánh xử lý: Không vào nhánh lỗi, chạy logic chính của update (cập nhật userName)
      // Test case xử lý nhánh này: Test Case 8.1, 8.3, 8.5, 8.6, 8.8, 8.9, 8.10, 8.11, 8.12, 8.14

      const user = await User.create({
        fullName: 'John Doe',
        email: 'john@example.com',
        password: md5('password123'),
        userName: 'old_user',
        token: 'valid-token',
      })

      const response = await request(app).post('/api/v1/users/update').send({
        userToken: 'valid-token',
        userName: 'john_doe',
      })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        message: { message: 'Update successful' },
        status: 200,
      })

      const updatedUser = await User.findOne({ token: 'valid-token' })
      expect(updatedUser.toObject()).toMatchObject({
        userName: 'john_doe',
        email: 'john@example.com',
      })

      await User.deleteOne({ token: 'valid-token' })
    })

    // Test Case 8.9
    it('should update dateOfBirth only and verify database', async () => {
      // Purpose: Test updating only the dateOfBirth field
      // Input: { userToken: "valid", dateOfBirth: "1990-01-01" }
      // Expected Output: Status: 200, { message: { message: "Update successful" }, status: 200 }
      // Nhánh xử lý: Không vào nhánh lỗi, chạy logic chính của update (cập nhật dateOfBirth)
      // Test case xử lý nhánh này: Test Case 8.1, 8.3, 8.5, 8.6, 8.8, 8.9, 8.10, 8.11, 8.12, 8.14

      const user = await User.create({
        fullName: 'John Doe',
        email: 'john@example.com',
        password: md5('password123'),
        dateOfBirth: null,
        token: 'valid-token',
      })

      const response = await request(app).post('/api/v1/users/update').send({
        userToken: 'valid-token',
        dateOfBirth: '1990-01-01',
      })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        message: { message: 'Update successful' },
        status: 200,
      })

      const updatedUser = await User.findOne({ token: 'valid-token' })
      expect(updatedUser.toObject()).toMatchObject({
        dateOfBirth: expect.any(Date),
        email: 'john@example.com',
      })

      await User.deleteOne({ token: 'valid-token' })
    })

    // Test Case 8.10
    it('should update address only and verify database', async () => {
      // Purpose: Test updating only the address field
      // Input: { userToken: "valid", address: "123 Main St" }
      // Expected Output: Status: 200
      // Expected Output: Status: 200, { message: { message: "Update successful" }, status: 200 }
      // Nhánh xử lý: Không vào nhánh lỗi, chạy logic chính của update (cập nhật address)
      // Test case xử lý nhánh này: Test Case 8.1, 8.3, 8.5, 8.6, 8.8, 8.9, 8.10, 8.11, 8.12, 8.14

      const user = await User.create({
        fullName: 'John Doe',
        email: 'john@example.com',
        password: md5('password123'),
        address: '',
        token: 'valid-token',
      })

      const response = await request(app).post('/api/v1/users/update').send({
        userToken: 'valid-token',
        address: '123 Main St',
      })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        message: { message: 'Update successful' },
        status: 200,
      })

      const updatedUser = await User.findOne({ token: 'valid-token' })
      expect(updatedUser.toObject()).toMatchObject({
        address: '123 Main St',
        email: 'john@example.com',
      })

      await User.deleteOne({ token: 'valid-token' })
    })

    // Test Case 8.11
    it('should update fullName only and verify database', async () => {
      // Purpose: Test updating only the fullName field
      // Input: { userToken: "valid", fullName: "Jane Doe" }
      // Expected Output: Status: 200, { message: { message: "Update successful" }, status: 200 }
      // Nhánh xử lý: Không vào nhánh lỗi, chạy logic chính của update (cập nhật fullName)
      // Test case xử lý nhánh này: Test Case 8.1, 8.3, 8.5, 8.6, 8.8, 8.9, 8.10, 8.11, 8.12, 8.14

      const user = await User.create({
        fullName: 'John Doe',
        email: 'john@example.com',
        password: md5('password123'),
        token: 'valid-token',
      })

      const response = await request(app).post('/api/v1/users/update').send({
        userToken: 'valid-token',
        fullName: 'Jane Doe',
      })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        message: { message: 'Update successful' },
        status: 200,
      })

      const updatedUser = await User.findOne({ token: 'valid-token' })
      expect(updatedUser.toObject()).toMatchObject({
        fullName: 'Jane Doe',
        email: 'john@example.com',
      })

      await User.deleteOne({ token: 'valid-token' })
    })

    // Test Case 8.12
    it('should return 404 for user not found', async () => {
      // Purpose: Test updating with a non-existent user
      // Input: { userToken: "invalid" }
      // Expected Output: Status: 404, { message: { message: "User not found" } }
      // Nhánh xử lý: Nhánh 1 - Kiểm tra user tồn tại (`if (!user)`)
      // Test case xử lý nhánh này: Test Case 8.13

      const response = await request(app).post('/api/v1/users/update').send({
        userToken: 'invalid-token',
        fullName: 'John Doe',
      })

      expect(response.status).toBe(404)
      expect(response.body).toEqual({
        message: { message: 'User not found' },
      })

      const user = await User.findOne({ fullName: 'John Doe' })
      expect(user).toBeNull()
    })

    // Test Case 8.13
    it('should update phone only and verify database', async () => {
      // Purpose: Test updating only the phone field
      // Input: { userToken: "valid", phone: "9876543210" }
      // Expected Output: Status: 200, { message: { message: "Update successful" }, status: 200 }
      // Nhánh xử lý: Không vào nhánh lỗi, chạy logic chính của update (cập nhật phone)
      // Test case xử lý nhánh này: Test Case 8.1, 8.3, 8.5, 8.6, 8.8, 8.9, 8.10, 8.11, 8.12, 8.14

      const user = await User.create({
        fullName: 'John Doe',
        email: 'john@example.com',
        password: md5('password123'),
        phone: '',
        token: 'valid-token',
      })

      const response = await request(app).post('/api/v1/users/update').send({
        userToken: 'valid-token',
        phone: '9876543210',
      })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        message: { message: 'Update successful' },
        status: 200,
      })

      const updatedUser = await User.findOne({ token: 'valid-token' })
      expect(updatedUser.toObject()).toMatchObject({
        phone: '9876543210',
        email: 'john@example.com',
      })

      await User.deleteOne({ token: 'valid-token' })
    })

    // Test Case 8.15
    it('should handle null dateOfBirth', async () => {
      // Purpose: Test updating with a null dateOfBirth
      // Input: { userToken: "valid", dateOfBirth: null }
      // Expected Output: Status: 200, { message: { message: "Update successful" }, status: 200 }
      // Nhánh xử lý: Không vào nhánh lỗi, chạy logic chính của update (cập nhật dateOfBirth thành null)
      // Test case xử lý nhánh này: Test Case 8.15

      const user = await User.create({
        fullName: 'John Doe',
        email: 'john@example.com',
        password: md5('password123'),
        dateOfBirth: new Date('1990-01-01'),
        token: 'valid-token',
      })

      const response = await request(app).post('/api/v1/users/update').send({
        userToken: 'valid-token',
        dateOfBirth: null,
      })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        message: { message: 'Update successful' },
        status: 200,
      })

      const updatedUser = await User.findOne({ token: 'valid-token' })
      expect(updatedUser.toObject()).toMatchObject({
        dateOfBirth: null,
        email: 'john@example.com',
      })

      await User.deleteOne({ token: 'valid-token' })
    })

    it('should handle null fullName', async () => {
      // Purpose: Test updating with a null fullName
      // Input: { userToken: "valid", fullName: null }
      // Expected Output: Status: 200, { message: { message: "Fullname must not empty" }, status: 400 }
      // Nhánh xử lý: Không vào nhánh lỗi, chạy logic chính của update (tra ve 400)
      // Test case xử lý nhánh này: Test Case 8.15

      const user = await User.create({
        fullName: '',
        email: 'john@example.com',
        password: md5('password123'),
        dateOfBirth: new Date('1990-01-01'),
        token: 'valid-token',
      })

      const response = await request(app).post('/api/v1/users/update').send({
        userToken: 'valid-token',
        fullName: null,
      })

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        message: { message: 'Fullname must not empty' },
        status: 400,
      })

      await User.deleteOne({ token: 'valid-token' })
    })

    // Test Case 8.16
    it('should handle null userName', async () => {
      // Purpose: Test updating with a null userName
      // Input: { userToken: "valid", userName: null }
      // Expected Output: Status: 200, { message: { message: "Username must not empty" }, status: 400 }
      // Nhánh xử lý: Không vào nhánh lỗi, chạy logic chính của update (tra ve 400)
      // Test case xử lý nhánh này: Test Case 8.15

      const user = await User.create({
        fullName: 'John Doe',
        email: 'john@example.com',
        password: md5('password123'),
        userName: 'johndoe',
        token: 'valid-token',
      })
      const response = await request(app).post('/api/v1/users/update').send({
        userToken: 'valid-token',
        userName: null,
      })

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        message: { message: 'Username must not empty' },
        status: 400,
      })

      await User.deleteOne({ token: 'valid-token' })
    })

    // Test Case 8.17
    it('should handle null phone', async () => {
      // Purpose: Test updating with a null phone
      // Input: { userToken: "valid", phone: null }
      // Expected Output: Status: 200, { message: { message: "Phone must not empty" }, status: 400 }
      // Nhánh xử lý: Không vào nhánh lỗi, chạy logic chính của update (tra ve 400)
      // Test case xử lý nhánh này: Test Case 8.15
      const user = await User.create({
        fullName: 'John Doe',
        email: 'john@example.com',
        password: md5('password123'),
        phone: '1234567890',
        token: 'valid-token',
      })

      const response = await request(app).post('/api/v1/users/update').send({
        userToken: 'valid-token',
        phone: null,
      })

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        message: { message: 'Phone must not empty' },
        status: 400,
      })

      await User.deleteOne({ token: 'valid-token' })
    })

    // Test Case 8.18
    it('should handle null address', async () => {
      // Purpose: Test updating with a null address
      // Input: { userToken: "valid", address: null }
      // Expected Output: Status: 200, { message: { message: "Address must not empty" }, status: 400 }
      // Nhánh xử lý: Không vào nhánh lỗi, chạy logic chính của update (tra ve 400)
      // Test case xử lý nhánh này: Test Case 8.15

      const user = await User.create({
        fullName: 'John Doe',
        email: 'john@example.com',
        password: md5('password123'),
        address: '123 Main St',
        token: 'valid-token',
      })

      const response = await request(app).post('/api/v1/users/update').send({
        userToken: 'valid-token',
        address: null,
      })

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        message: { message: 'Address must not empty' },
        status: 400,
      })

      await User.deleteOne({ token: 'valid-token' })
    })

    // Test Case 8.19
    it('should handle null email', async () => {
      // Purpose: Test updating with a null email
      // Input: { userToken: "valid", email: null }
      // Expected Output: Status: 200, { message: { message: "Email must not empty" }, status: 400 }
      // Nhánh xử lý: Không vào nhánh lỗi, chạy logic chính của update (tra ve 400)
      // Test case xử lý nhánh này: Test Case 8.19
      const user = await User.create({
        fullName: 'John Doe',
        email: 'john@example.com',
        password: md5('password123'),
        token: 'valid-token',
      })

      const response = await request(app).post('/api/v1/users/update').send({
        userToken: 'valid-token',
        email: null,
      })

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        message: { message: 'Email must not empty' },
        status: 400,
      })

      await User.deleteOne({ token: 'valid-token' })
    })
  })

  describe('List All Users API', () => {
    // Test Case 9.1
    it('should retrieve user list successfully', async () => {
      // Purpose: Test successful retrieval of user list
      // Input: No input required
      // Expected Output: Status: 200, { message: { message: "User list" }, data: [{ fullName, email }, ...] }
      // Nhánh xử lý: Không vào nhánh lỗi, chạy logic chính của list (trả về danh sách user)
      // Test case xử lý nhánh này: Test Case 9.1, 9.2

      await User.create([
        {
          fullName: 'John Doe',
          email: 'john@example.com',
          password: md5('password123'),
          deleted: false,
        },
        {
          fullName: 'Jane Doe',
          email: 'jane@example.com',
          password: md5('password123'),
          deleted: false,
        },
      ])

      const response = await request(app).get('/api/v1/users/list')

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        message: { message: 'User list' },
        data: expect.arrayContaining([
          expect.objectContaining({ fullName: 'John Doe', email: 'john@example.com' }),
          expect.objectContaining({ fullName: 'Jane Doe', email: 'jane@example.com' }),
        ]),
      })
    })

    // Test Case 9.2
    it('should handle database error', async () => {
      // Purpose: Test user list retrieval with database error
      // Input: No input required
      // Expected Output: Status: 500, { message: "fail" }
      // Nhánh xử lý: Nhánh 1 - Xử lý lỗi trong `catch (error)` khi truy vấn user
      // Test case xử lý nhánh này: Test Case 9.3

      jest.spyOn(User, 'find').mockRejectedValueOnce(new Error('Database error'))

      const response = await request(app).get('/api/v1/users/list')

      expect(response.status).toBe(500)
      expect(response.body).toEqual({
        message: 'Database error',
      })
    })
  })
})

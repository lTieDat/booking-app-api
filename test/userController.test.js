const request = require('supertest')
const mongoose = require('mongoose')
const { app, server } = require('../index')
const User = require('../models/user.model')
const mailHelper = require('../helper/sendmail')
const md5 = require('md5')

jest.mock('../../../helper/sendmail') // Mock email sending

afterAll(async () => {
  await mongoose.connection.close()
  if (server && server.close) await server.close()
})

describe('User Registration API', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
  })

  beforeEach(async () => {
    await User.deleteMany() // Clear users before each test
  })

  it('should register a user, generate OTP, and send an email', async () => {
    mailHelper.sendMail.mockResolvedValueOnce(true)

    const response = await request(app).post('/api/v1/users/register').send({
      fullName: 'John Doe',
      email: 'johndoe@example.com',
      password: 'Secure123!',
    })

    expect(response.status).toBe(201) // Correct status code for user creation
    expect(response.body).toMatchObject({
      message: { message: 'Registration successful. Please check your email to verify your account.' },
      token: expect.any(String), // Ensure token is returned
    })
    expect(mailHelper.sendMail).toHaveBeenCalled() // Ensure email function was called
  })

  it('should return 409 if email already exists', async () => {
    await User.create({
      fullName: 'John Doe',
      email: 'existing@example.com',
      password: md5('Secure123!'), // Hash password before saving
    })

    const response = await request(app).post('/api/v1/users/register').send({
      fullName: 'John Doe',
      email: 'existing@example.com',
      password: 'Secure123!',
    })

    expect(response.status).toBe(409)
    expect(response.body.message).toBe('Email already exists')
  })

  it('should return 400 if email format is invalid', async () => {
    const response = await request(app).post('/api/v1/users/register').send({
      fullName: 'John Doe',
      email: 'invalid-email',
      password: 'Secure123!',
    })

    expect(response.status).toBe(400)
    expect(response.body.message).toContain('Invalid email format')
  })

  it('should return 400 if password is too short', async () => {
    const response = await request(app).post('/api/v1/users/register').send({
      fullName: 'John Doe',
      email: 'johndoe@example.com',
      password: '123',
    })

    expect(response.status).toBe(400)
    expect(response.body.message).toContain('Password must be at least 8 characters long')
  })
})

describe('User Login API', () => {
  beforeEach(async () => {
    await User.deleteMany()
    await User.create({
      fullName: 'Test User',
      email: 'user@example.com',
      password: md5('Secure123!'),
      verified: true,
      role: 'customer',
      token: '1234567890abcdefghjk',
    })
  })

  it('should log in with valid credentials', async () => {
    const response = await request(app).post('/api/v1/users/login').send({
      email: 'user@example.com',
      password: 'Secure123!',
    })

    console.log(response.body) // Add this to check what's being returned
    console.log(response.status) // Check actual response status

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('token')
  })

  it('should return 404 if email does not exist', async () => {
    const response = await request(app).post('/api/v1/users/login').send({
      email: 'nonexistent@example.com',
      password: 'Secure123!',
    })

    expect(response.status).toBe(404)
    expect(response.body.message).toBe('Email not found')
  })

  it('should return 403 if password is incorrect', async () => {
    const response = await request(app).post('/api/v1/users/login').send({
      email: 'user@example.com',
      password: 'WrongPassword!',
    })

    expect(response.status).toBe(403)
    expect(response.body.message).toBe('Incorrect password')
  })

  it('should return 403 if account is not verified', async () => {
    await User.create({
      fullName: 'Test User',
      email: 'unverified@example.com',
      password: md5('Secure123!'),
      verified: false,
    })

    const response = await request(app).post('/api/v1/users/login').send({
      email: 'unverified@example.com',
      password: 'Secure123!',
    })

    expect(response.status).toBe(403)
    expect(response.body.message).toBe('Account not verified')
  })
})

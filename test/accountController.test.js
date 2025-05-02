const request = require('supertest')
const mongoose = require('mongoose')
const { app, server } = require('../index')
const Account = require('../models/account.model')
const Review = require('../models/review.model')
const Hotel = require('../models/hotelDetail.model')
const md5 = require('md5')

afterAll(async () => {
    await mongoose.connection.close()
    if (server && server.close) await server.close()
})

// Checking Admin Login (account.controller.adminLogin() function)
describe('Admin Login API', () => {
    beforeEach(async () => {
        // await Account.deleteMany()

        await Account.create({
            email: 'admin@example.com',
            password: md5('AdminPass123'),
            role: 'admin',
            token: 'secureadmintoken123',
        })
    })

    // Test case AL1.1 - Email not found
    it('should return 404 if email does not exist', async () => {
        const response = await request(app).post('/api/v1/admin/login').send({
            email: 'notfound@example.com',
            password: 'anyPassword',
        })

        expect(response.status).toBe(200)
        expect(response.body.status).toBe(404)
        expect(response.body.message).toBe('Email not found')
    })

    // Test case AL1.2 - Incorrect password
    it('should return 401 if password is incorrect', async () => {
        const response = await request(app).post('/api/v1/admin/login').send({
            email: 'admin@example.com',
            password: 'WrongPass!',
        })

        expect(response.status).toBe(200)
        expect(response.body.status).toBe(401)
        expect(response.body.message).toBe('Incorrect password')
    })

    // Test case AL1.3 - Successful login
    it('should log in with valid credentials', async () => {
        const response = await request(app).post('/api/v1/admin/login').send({
            email: 'admin@example.com',
            password: 'AdminPass123',
        })

        expect(response.status).toBe(200)
        expect(response.body.status).toBe(200)
        expect(response.body.message).toBe('Login successful')
        expect(response.body).toHaveProperty('token')
        expect(response.body).toHaveProperty('data')
    })

    // Test case AL1.4 - System error (DB failure)
    it('should return 500 if internal server error occurs', async () => {
        // Temporarily simulate a DB failure
        const originalFindOne = Account.findOne
        Account.findOne = jest.fn().mockImplementation(() => {
            throw new Error('Simulated DB error')
        })

        const response = await request(app).post('/api/v1/admin/login').send({
            email: 'admin@example.com',
            password: 'AdminPass123',
        })

        expect(response.status).toBe(200)
        expect(response.body.status).toBe(500)
        expect(response.body.message).toBe('Login failed')

        // Restore original method
        Account.findOne = originalFindOne
    })
})


// Checking Getting Admin Account Details (module.exports.adminMe() function)
describe('Get Admin Account Details API', () => {
    const validToken = 'valid-token-abc123'

    beforeEach(async () => {
        // await Account.deleteMany()
        await Account.create({
            email: 'admin@example.com',
            password: md5('AdminPass123'),
            role: 'admin',
            token: validToken,
        })
    })

    // Test case AM2.1 - Token not associated with any account
    it('should return 404 if token is invalid (account not found)', async () => {
        const response = await request(app).get('/api/v1/admin/me').query({
            tokenID: 'nonexistent-token-xyz',
        })

        expect(response.status).toBe(200)
        expect(response.body.status).toBe(404)
        expect(response.body.message).toMatch(/account not found/i)
    })

    // Test case AM2.2 - Token associated with an account
    it('should return account details for valid token', async () => {
        const response = await request(app).get('/api/v1/admin/me').query({
            tokenID: validToken,
        })

        expect(response.status).toBe(200)
        expect(response.body.status).toBe(200)
        expect(response.body).toHaveProperty('data')
        expect(response.body.data).toHaveProperty('email', 'admin@example.com')
    })

    // Test case AM2.3 - System error (DB failure)
    it('should return 500 if internal server error occurs', async () => {
        // Temporarily override Account.findOne to throw an error
        const originalFindOne = Account.findOne
        Account.findOne = jest.fn().mockImplementation(() => {
            throw new Error('Simulated DB failure')
        })

        const response = await request(app).get('/api/v1/admin/me').query({
            tokenID: validToken,
        })

        expect(response.status).toBe(200)
        expect(response.body.status).toBe(500)
        expect(response.body.message).toMatch(/get account failed/i)

        // Restore original method
        Account.findOne = originalFindOne
    })
})

// Checking Update the details of an account by its ID (account.controller.updateAccount() function)
describe('Update Admin Account API', () => {
    let existingAccountId

    beforeEach(async () => {
        // await Account.deleteMany()

        const createdAccount = await Account.create({
            email: 'admin@update.com',
            password: md5('OldPass123'),
            role: 'customer',
            token: 'admintoken123',
        })

        existingAccountId = createdAccount._id.toString()
    })

    // Test case UA3.1 - Account to be updated does not exist
    it('should return 404 if account does not exist', async () => {
        const fakeId = new mongoose.Types.ObjectId()

        const response = await request(app)
            .put(`/api/v1/admin/superAdmin/account/${fakeId}`)
            .send({
                email: 'newemail@example.com',
                password: 'NewPassword123',
                role: 'admin',
            })

        expect(response.status).toBe(200)
        expect(response.body.status).toBe(404)
        expect(response.body.message).toBe('Account not found')
    })

    // Test case UA3.2 - Successfully update account
    it('should update account successfully with valid data', async () => {
        const response = await request(app)
            .put(`/api/v1/admin/superAdmin/account/${existingAccountId}`)
            .send({
                email: 'updated@example.com',
                password: 'UpdatedPass456',
                role: 'admin',
            })

        expect(response.status).toBe(200)
        expect(response.body.status).toBe(200)
        expect(response.body.message).toMatch(/updated successfully/i)
        expect(response.body.data.email).toBe('updated@example.com')
        // expect(response.body.data.role).toBe('admin')

        const updatedAccount = await Account.findById(existingAccountId)
        expect(updatedAccount.password).toBe(md5('UpdatedPass456'))
    })

    // Test case UA3.3 - System error (DB failure)
    it('should return 500 if internal error occurs during update', async () => {
        const originalFindById = Account.findById
        Account.findById = jest.fn().mockImplementation(() => {
            throw new Error('Simulated DB error')
        })

        const response = await request(app)
            .put(`/api/v1/admin/superAdmin/account/${existingAccountId}`)
            .send({
                email: 'error@example.com',
                password: 'ErrorPass',
                role: 'admin',
            })

        expect(response.status).toBe(200)
        expect(response.body.status).toBe(500)
        expect(response.body.message).toBe('Update account failed')

        // Restore original
        Account.findById = originalFindById
    })
})

// Checking Delete an account by its ID (account.controller.deleteAccount() function)
describe('Delete Admin Account API', () => {
    let existingAccountId

    beforeEach(async () => {
        // await Account.deleteMany()

        const account = await Account.create({
            email: 'delete@example.com',
            password: md5('DeleteMe123'),
            role: 'admin',
            token: 'deleteToken123',
        })

        existingAccountId = account._id.toString()
    })

    // DA4.1 - Account to be deleted does not exist
    it('should return 404 if account to delete does not exist', async () => {
        const fakeId = new mongoose.Types.ObjectId()

        const response = await request(app)
            .delete(`/api/v1/admin/superAdmin/account/${fakeId}`)

        expect(response.status).toBe(200)
        expect(response.body.status).toBe(404)
        expect(response.body.message).toBe('Account not found')
    })

    // DA4.2 - Successfully delete account
    it('should delete account successfully', async () => {
        const response = await request(app)
            .delete(`/api/v1/admin/superAdmin/account/${existingAccountId}`)

        expect(response.status).toBe(200)
        expect(response.body.status).toBe(200)
        expect(response.body.message).toBe('Account deleted successfully')

        const deleted = await Account.findById(existingAccountId)
        expect(deleted).toBeNull()
    })

    // DA4.3 - System error (DB failure)
    it('should return 500 if internal error occurs', async () => {
        const originalFindById = Account.findById
        Account.findById = jest.fn().mockImplementation(() => {
            throw new Error('Simulated DB error')
        })

        const response = await request(app)
            .delete(`/api/v1/admin/superAdmin/account/${existingAccountId}`)

        expect(response.status).toBe(200)
        expect(response.body.status).toBe(500)
        expect(response.body.message).toBe('Delete account failed')

        // Restore original
        Account.findById = originalFindById
    })
})


// Checking Fetch all accounts from the database (account.controller.getAccounts() function)
describe('Get All Accounts API', () => {
    beforeEach(async () => {
        // await Account.deleteMany()

        await Account.create([
            {
                email: 'admin1@example.com',
                password: md5('Pass123'),
                role: 'admin',
                token: 'token123',
            },
            {
                email: 'admin2@example.com',
                password: md5('Pass456'),
                role: 'superadmin',
                token: 'token456',
            }
        ])
    })

    // Test case GA5.1 - Successfully fetch all accounts
    it('should return all accounts successfully', async () => {
        const response = await request(app).get('/api/v1/admin/superAdmin/accounts')

        expect(response.status).toBe(200)
        expect(response.body.status).toBe(200)
        expect(response.body.message).toMatch(/accounts fetched successfully/i)
        expect(Array.isArray(response.body.data)).toBe(true)
        expect(response.body.data.length).toBeGreaterThanOrEqual(2)
    })

    // Test case GA5.2 - Simulated internal server error
    it('should return 500 if database fetch fails', async () => {
        // Simulate DB error
        const originalFind = Account.find
        Account.find = jest.fn().mockImplementation(() => {
            throw new Error('Simulated DB failure')
        })

        const response = await request(app).get('/api/v1/admin/superAdmin/accounts')

        expect(response.status).toBe(200)
        expect(response.body.status).toBe(500)
        expect(response.body.message).toBe('Get accounts failed')

        // Restore original method
        Account.find = originalFind
    })
})

// Checking Create a new account (account.controller.createAccount() function)
describe('Create Account API', () => {
    beforeEach(async () => {
        // await Account.deleteMany()
    })

    // CA6.1 - Successful account creation
    it('should create account successfully with valid input', async () => {
        const response = await request(app)
            .post('/api/v1/admin/superAdmin/account')
            .send({
                email: 'admin1@example.com',
                password: 'StrongPass123',
                role: 'admin'
            })

        expect(response.status).toBe(200)
        expect(response.body.status).toBe(200)
        expect(response.body.message).toBe('Account created successfully')
        expect(response.body.data).toHaveProperty('email', 'admin1@example.com')
        expect(response.body.data).toHaveProperty('token')
    })

    // CA6.2 - Simulate DB error
    it('should return 500 if internal server error occurs', async () => {
        const originalSave = Account.prototype.save
        Account.prototype.save = jest.fn(() => {
            throw new Error('Simulated DB error')
        })

        const response = await request(app)
            .post('/api/v1/admin/superAdmin/account')
            .send({
                email: 'failadmin@example.com',
                password: 'Fail123',
                role: 'admin'
            })

        expect(response.status).toBe(200)
        expect(response.body.status).toBe(500)
        expect(response.body.message).toBe('Create account failed')

        Account.prototype.save = originalSave
    })
})

// Checking Add a new review or update an existing review for a hotel using the hotel ID and user ID (hotel.controller.addReview() function)
describe('Add a new review or update an existing review API', () => {
    let hotelId
    let userId
    const bookingId = 'b789'

    beforeEach(async () => {
        // await Review.deleteMany()
        // await Hotel.deleteMany()

        const hotelObjectId = new mongoose.Types.ObjectId()
        hotelIdStr = hotelObjectId.toString()
        userId = new mongoose.Types.ObjectId().toString()

        await Hotel.create({
            _id: hotelObjectId,
            HotelId: hotelIdStr,
            HotelName: 'Test Hotel',
            Description: 'Test Description',
            Rating: 0,
            Address: {
                StreetAddress: '123 Main St',
                City: 'Testville',
                StateProvince: 'CA',
                PostalCode: '12345',
                Country: 'Testland',
            },
            Location: {
                type: 'Point',
                coordinates: [0, 0],
            },
            images: {
                imgSource: 'test.jpg',
            },
        })
    })

    // AR7.1 - Hotel not found
    it('should return 404 if hotel is not found', async () => {
        const invalidHotelId = new mongoose.Types.ObjectId()

        const res = await request(app)
            .post(`/api/v1/hotel/${invalidHotelId}/review/${userId}`)
            .send({
                reviewText: 'Great place!',
                rating: 5,
                bookingId,
            })

        expect(res.status).toBe(404)
        // expect(res.body.status).toBe(404)
        expect(res.body.message).toBe('Hotel not found.')
    })

    // AR7.2 - Update an existing review
    it('should update an existing review', async () => {
        await Review.create({
            hotelId,
            userId,
            reviewText: 'Old review',
            rating: 3,
            bookingId,
        })

        const res = await request(app)
            .post(`/api/v1/hotel/${hotelId}/review/${userId}`)
            .send({
                reviewText: 'Great place!',
                rating: 5,
                bookingId,
            })

        expect(res.status).toBe(200)
        expect(res.body.status).toBe(200)
        expect(res.body.message).toBe('Review updated successfully.')
        expect(res.body.review.reviewText).toBe('Great place!')
        expect(res.body.review.rating).toBe(5)
    })

    // AR7.3 - Add a new review
    it('should add a new review', async () => {
        const res = await request(app)
            .post(`/api/v1/hotel/${hotelId}/review/${userId}`)
            .send({
                reviewText: 'Awesome stay!',
                rating: 4,
                bookingId,
            })

        expect(res.status).toBe(200)
        expect(res.body.status).toBe(200)
        expect(res.body.message).toBe('Review added successfully.')
        expect(res.body.review.reviewText).toBe('Awesome stay!')
        expect(res.body.review.rating).toBe(4)

        const reviewInDb = await Review.findOne({ hotelId, userId, bookingId })
        expect(reviewInDb).not.toBeNull()
        expect(reviewInDb.reviewText).toBe('Awesome stay!')
    })

    // AR7.4 - Simulate DB failure
    it('should return 500 if there is a server/database error', async () => {
        const originalFind = Review.findOne
        Review.findOne = jest.fn().mockImplementation(() => {
            throw new Error('Simulated DB error')
        })

        const res = await request(app)
            .post(`/api/v1/hotel/${hotelId}/review/${userId}`)
            .send({
                reviewText: 'Oops!',
                rating: 1,
                bookingId,
            })

        expect(res.status).toBe(500)
        // expect(res.body.status).toBe(500)
        expect(res.body.message).toBe('An error occurred while processing the review.')

        Review.findOne = originalFind // restore
    })
})

// Checking Fetch all reviews for a specific hotel (hotel.controller.getReviews() function)
describe('Fetch all reviews API', () => {
    let hotelId

    beforeEach(async () => {
        // await Review.deleteMany()4
        hotelId = new mongoose.Types.ObjectId()
        await Review.create([
            {
                hotelId: hotelIdStr,
                userId: 'user1',
                rating: 4,
                reviewText: 'Great place!',
                bookingId: 'b1',
            },
            {
                hotelId: hotelIdStr,
                userId: 'user2',
                rating: 5,
                reviewText: 'Excellent!',
                bookingId: 'b2',
            },
        ])
    })

    // GR8.1 - Successfully get reviews
    it('should return 200 and list of reviews for a valid hotelId', async () => {
        const response = await request(app).get(`/api/v1/hotel/${hotelId}/reviews`)

        expect(response.status).toBe(200)
        // expect(response.body.status).toBe(200)
        expect(response.body.message).toBe('Reviews found.')
        expect(Array.isArray(response.body.data)).toBe(true)
    })

    // GR8.2 - Simulated DB/server error
    it('should return 500 if database error occurs', async () => {
        const originalFind = Review.find
        Review.find = jest.fn().mockImplementation(() => {
            throw new Error('Simulated DB failure')
        })

        const response = await request(app).get(`/api/v1/hotel/${hotelId}/reviews`)

        expect(response.status).toBe(500)
        // expect(response.body.status).toBe(500)
        expect(response.body.message).toBe('An error occurred while getting reviews.')

        Review.find = originalFind
    })
})

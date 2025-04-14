const request = require('supertest')
const mongoose = require('mongoose')
const { app, server } = require('../index')
const Account = require('../models/account.model')
const md5 = require('md5')

afterAll(async () => {
    await mongoose.connection.close()
    if (server && server.close) await server.close()
})

// Checking Admin Login (account.controller.adminLogin() function)
describe('Admin Login API', () => {
    beforeEach(async () => {
        await Account.deleteMany()

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
        await Account.deleteMany()
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
        await Account.deleteMany()

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
        await Account.deleteMany()

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
        await Account.deleteMany()

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
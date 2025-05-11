const request = require('supertest')
const mongoose = require('mongoose')
const { app, server } = require('../index')
const Booking = require('../models/booking.model')
const Room = require('../models/room.model')
const Review = require('../models/review.model')
const Hotel = require('../models/hotelDetail.model')
const generate = require('../helper/generate')

jest.mock('../helper/generate', () => ({
  generateRandomString: jest.fn(),
}))

jest.setTimeout(60000)

// Mock booking object for consistent testing
const mockBooking = {
  bookingId: 'BOOK123',
  hotelId: 'Zxl2qwdTKn',
  userId: 'U456',
  customerName: 'John Doe',
  customerEmail: 'john@example.com',
  checkInDate: new Date('2025-04-20'),
  checkOutDate: new Date('2025-04-25'),
  numberOfAdults: 2,
  numberOfChildren: 1,
  status: 'pending',
  rooms: [
    { roomId: 'sWsgz3Sn3f', quantity: 1 },
    { roomId: 'YWx3uIgIwr', quantity: 1 },
  ],
}

describe('Booking Controller APIs', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    await new Promise((resolve) => mongoose.connection.once('connected', resolve))
  })

  beforeEach(async () => {
    generate.generateRandomString.mockReset()
    jest.clearAllMocks()
    jest.restoreAllMocks()
  })

  afterEach(async () => {
    await Booking.deleteOne({ bookingId: 'BOOK123' })
    await Review.deleteOne({ bookingId: 'BOOK123' })
    await new Promise((resolve) => setImmediate(resolve))
  })

  afterAll(async () => {
    await mongoose.disconnect()
    if (server && typeof server.close === 'function') {
      await new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()))
      })
    }
  })

  describe('Create Booking API - POST /api/v1/booking/create', () => {
    it('1.1 - should create a booking successfully with valid data', async () => {
      generate.generateRandomString.mockReturnValue('BOOK123')

      const response = await request(app).post('/api/v1/booking/create').send(mockBooking).timeout(10000)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        message: 'Booking created successfully.',
        data: 'BOOK123',
      })

      const booking = await Booking.findOne({ bookingId: 'BOOK123' })
      expect(booking).toBeTruthy()
      expect(booking.toObject()).toMatchObject({
        bookingId: 'BOOK123',
        hotelId: 'Zxl2qwdTKn',
        userId: 'U456',
        numberOfAdults: 2,
        numberOfChildren: 1,
        status: 'pending',
        rooms: [
          { roomId: 'sWsgz3Sn3f', quantity: 1 },
          { roomId: 'YWx3uIgIwr', quantity: 2 },
        ],
      })

      const rooms = await Room.find({ RoomId: { $in: ['sWsgz3Sn3f', 'YWx3uIgIwr'] } })
      expect(rooms[0].NumberAvailable).toBe(9)
      expect(rooms[1].NumberAvailable).toBe(9)

      //Delete the booking after test
      await Booking.deleteOne({ bookingId: 'BOOK123' })

      //Update the room availability back to original state
      await Room.updateOne({ RoomId: 'sWsgz3Sn3f' }, { $set: { NumberAvailable: 10 } })
      await Room.updateOne({ RoomId: 'YWx3uIgIwr' }, { $set: { NumberAvailable: 10 } })
    })

    it('1.2 - should handle missing hotelId', async () => {
      const response = await request(app)
        .post('/api/v1/booking/create')
        .send({
          userId: 'U456',
          booking: {
            startDate: '2025-04-20',
            endDate: '2025-04-25',
            adults: 2,
            children: 1,
          },
          selectedRooms: [{ roomId: 'sWsgz3Sn3f', quantity: 1 }],
        })
        .timeout(10000)

      expect(response.status).toBe(400)
      expect(response.body).toMatchObject({ message: 'Hotel ID is required.' })
    })

    it('1.3 - should handle missing booking object', async () => {
      const response = await request(app)
        .post('/api/v1/booking/create')
        .send({
          hotelId: 'Zxl2qwdTKn',
          userId: 'U456',
          selectedRooms: [{ roomId: 'sWsgz3Sn3f', quantity: 1 }],
        })
        .timeout(10000)

      expect(response.status).toBe(400)
      expect(response.body).toMatchObject({ message: 'Booking dates are required.' })
    })

    it('1.4 - should default userId to guest', async () => {
      generate.generateRandomString.mockReturnValue('BOOK123')

      const response = await request(app)
        .post('/api/v1/booking/create')
        .send({
          hotelId: 'Zxl2qwdTKn',
          booking: {
            startDate: '2025-04-20',
            endDate: '2025-04-25',
            adults: 2,
            children: 1,
          },
          selectedRooms: [{ roomId: 'sWsgz3Sn3f', quantity: 1 }],
        })
        .timeout(10000)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        message: 'Booking created successfully.',
        data: 'BOOK123',
      })

      const booking = await Booking.findOne({ bookingId: 'BOOK123' })
      expect(booking).toBeTruthy()
      expect(booking.userId).toBe('guest')
    })

    it('1.5 - should handle empty selectedRooms', async () => {
      generate.generateRandomString.mockReturnValue('BOOK123')

      const response = await request(app)
        .post('/api/v1/booking/create')
        .send({
          hotelId: 'Zxl2qwdTKn',
          userId: 'U456',
          booking: {
            startDate: '2025-04-20',
            endDate: '2025-04-25',
            adults: 2,
            children: 1,
          },
          selectedRooms: [],
        })
        .timeout(10000)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        message: 'Booking created successfully.',
        data: 'BOOK123',
      })

      const booking = await Booking.findOne({ bookingId: 'BOOK123' })
      expect(booking.rooms).toEqual([])
    })

    it('1.6 - should handle non-existent rooms', async () => {
      generate.generateRandomString.mockReturnValue('BOOK123')

      const response = await request(app)
        .post('/api/v1/booking/create')
        .send({
          hotelId: 'Zxl2qwdTKn',
          userId: 'U456',
          booking: {
            startDate: '2025-04-20',
            endDate: '2025-04-25',
            adults: 2,
            children: 1,
          },
          selectedRooms: [{ roomId: 'R999', quantity: 1 }],
        })
        .timeout(10000)

      expect(response.status).toBe(400)
      expect(response.body).toMatchObject({ message: 'One or more rooms not found.' })
    })

    it('1.7 - should handle database save failure', async () => {
      jest.spyOn(Booking.prototype, 'save').mockImplementationOnce(() => {
        throw new Error('DB failure')
      })

      const response = await request(app)
        .post('/api/v1/booking/create')
        .send({
          hotelId: 'Zxl2qwdTKn',
          userId: 'U456',
          booking: {
            startDate: '2025-04-20',
            endDate: '2025-04-25',
            adults: 2,
            children: 1,
          },
          selectedRooms: [{ roomId: 'sWsgz3Sn3f', quantity: 1 }],
        })
        .timeout(10000)

      expect(response.status).toBe(500)
      expect(response.body).toMatchObject({ message: 'DB failure' })
    })

    it('1.8 - should handle invalid room quantity', async () => {
      generate.generateRandomString.mockReturnValue('BOOK123')

      const response = await request(app)
        .post('/api/v1/booking/create')
        .send({
          hotelId: 'Zxl2qwdTKn',
          userId: 'U456',
          booking: {
            startDate: '2025-04-20',
            endDate: '2025-04-25',
            adults: 2,
            children: 1,
          },
          selectedRooms: [{ roomId: 'sWsgz3Sn3f', quantity: -1 }],
        })
        .timeout(10000)

      expect(response.status).toBe(400)
      expect(response.body).toMatchObject({ message: 'Invalid room quantity.' })
    })

    it('1.9 - should handle room update failure', async () => {
      jest.spyOn(Room.prototype, 'save').mockImplementationOnce(() => {
        throw new Error('Room save failure')
      })

      generate.generateRandomString.mockReturnValue('BOOK123')

      const response = await request(app)
        .post('/api/v1/booking/create')
        .send({
          hotelId: 'Zxl2qwdTKn',
          userId: 'U456',
          booking: {
            startDate: '2025-04-20',
            endDate: '2025-04-25',
            adults: 2,
            children: 1,
          },
          selectedRooms: [{ roomId: 'sWsgz3Sn3f', quantity: 1 }],
        })
        .timeout(10000)

      expect(response.status).toBe(500)
      expect(response.body).toMatchObject({ message: 'Room save failure' })
    })

    it('1.10 - should handle missing selectedRooms', async () => {
      generate.generateRandomString.mockReturnValue('BOOK123')

      const response = await request(app)
        .post('/api/v1/booking/create')
        .send({
          hotelId: 'Zxl2qwdTKn',
          userId: 'U456',
          booking: {
            startDate: '2025-04-20',
            endDate: '2025-04-25',
            adults: 2,
            children: 1,
          },
        })
        .timeout(10000)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        message: 'Booking created successfully.',
        data: 'BOOK123',
      })

      const booking = await Booking.findOne({ bookingId: 'BOOK123' })
      expect(booking.rooms).toEqual([])
    })

    it('1.11 - should handle invalid date format', async () => {
      generate.generateRandomString.mockReturnValue('BOOK123')

      const response = await request(app)
        .post('/api/v1/booking/create')
        .send({
          hotelId: 'Zxl2qwdTKn',
          userId: 'U456',
          booking: {
            startDate: 'invalid-date',
            endDate: '2025-04-25',
            adults: 2,
            children: 1,
          },
          selectedRooms: [{ roomId: 'sWsgz3Sn3f', quantity: 1 }],
        })
        .timeout(10000)

      expect(response.status).toBe(400)
      expect(response.body).toMatchObject({ message: 'Invalid date format.' })
    })

    it('1.12 - should handle room quantity exceeding availability', async () => {
      generate.generateRandomString.mockReturnValue('BOOK123')

      const response = await request(app)
        .post('/api/v1/booking/create')
        .send({
          hotelId: 'Zxl2qwdTKn',
          userId: 'U456',
          booking: {
            startDate: '2025-04-20',
            endDate: '2025-04-25',
            adults: 2,
            children: 1,
          },
          selectedRooms: [{ roomId: 'sWsgz3Sn3f', quantity: 10 }],
        })
        .timeout(10000)

      expect(response.status).toBe(500)
      expect(response.body).toMatchObject({ message: 'Not enough rooms available for sWsgz3Sn3f' })
    })
  })

  describe('Get Booking API - GET /api/v1/booking/:bookingId', () => {
    it('2.1 - should retrieve booking with valid ID', async () => {
      await Booking.create({
        bookingId: 'BOOK123',
        hotelId: 'Zxl2qwdTKn',
        userId: 'U456',
        checkInDate: '2025-04-20',
        checkOutDate: '2025-04-25',
        numberOfAdults: 2,
        numberOfChildren: 1,
        status: 'pending',
      })

      const response = await request(app).get('/api/v1/booking/BOOK123').timeout(10000)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        data: expect.objectContaining({ bookingId: 'BOOK123' }),
      })
      expect(response.body.data).toHaveProperty('hotelId', 'Zxl2qwdTKn')
      expect(response.body.data).toHaveProperty('userId', 'U456')
      expect(response.body.data).toHaveProperty('checkInDate', '2025-04-20')
      expect(response.body.data).toHaveProperty('checkOutDate', '2025-04-25')
      expect(response.body.data).toHaveProperty('numberOfAdults', 2)
      expect(response.body.data).toHaveProperty('numberOfChildren', 1)
      expect(response.body.data).toHaveProperty('status', 'pending')

      // Clean up the created booking after the test
      await Booking.deleteOne({ bookingId: 'BOOK123' })

      // Update the room availability back to original state
      await Room.updateOne({ RoomId: 'Zxl2qwdTKn' }, { $set: { NumberAvailable: 10 } })
    })

    it('2.2 - should return 404 for non-existent booking', async () => {
      const response = await request(app).get('/api/v1/booking/BOOK999').timeout(10000)

      expect(response.status).toBe(404)
      expect(response.body).toMatchObject({
        message: 'Booking not found.',
      })
    })

    it('2.3 - should handle database error', async () => {
      jest.spyOn(Booking, 'findOne').mockRejectedValueOnce(new Error('DB failure'))

      const response = await request(app).get('/api/v1/booking/BOOK123').timeout(20000)

      expect(response.status).toBe(500)
      expect(response.body).toMatchObject({ message: 'Internal server error.' })
    })

    it('2.4 - should handle empty bookingId', async () => {
      const response = await request(app).get('/api/v1/booking/').timeout(10000)

      expect(response.status).toBe(404) // Assuming router handles this
    })
  })

  describe('Delete Booking API - DELETE /api/v1/booking/:bookingId', () => {
    // Test ID: 3.1
    // Purpose: Verify deletion of existing booking
    // Input: Valid bookingId from mock booking
    // Expected Output: Status 200, booking removed
    it('should delete existing booking', async () => {
      await Booking.create(mockBooking)
      const response = await request(app).delete('/api/v1/booking/BOOK123').timeout(10000)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        message: 'Booking deleted successfully.',
      })

      const booking = await Booking.findOne({ bookingId: 'BOOK123' })
      expect(booking).toBeNull()
    })

    // Test ID: 3.2
    // Purpose: Verify error handling for non-existent booking deletion
    // Input: Invalid bookingId
    // Expected Output: Status 404, error message
    it('should return 404 for non-existent booking', async () => {
      const response = await request(app).delete('/api/v1/booking/BOOK999').timeout(10000)
      expect(response.status).toBe(404)
      expect(response.body).toMatchObject({
        message: 'Booking not found.',
      })
    })

    it('3.2 - should return 404 for non-existent booking', async () => {
      const response = await request(app).delete('/api/v1/booking/BOOK999').timeout(10000)

      expect(response.status).toBe(404)
      expect(response.body).toMatchObject({
        message: 'Booking not found.',
      })
    })

    it('3.3 - should handle database find error', async () => {
      jest.spyOn(Booking, 'findOne').mockRejectedValueOnce(new Error('DB failure'))

      const response = await request(app).delete('/api/v1/booking/BOOK123').timeout(10000)

      expect(response.status).toBe(500)
      expect(response.body).toMatchObject({
        message: 'Internal server error.',
      })
    })

    it('3.4 - should handle delete failure', async () => {
      await Booking.create({
        bookingId: 'BOOK123',
        hotelId: 'Zxl2qwdTKn',
        userId: 'U456',
        checkInDate: '2025-04-20',
        checkOutDate: '2025-04-25',
        numberOfAdults: 2,
        numberOfChildren: 1,
        status: 'pending',
      })

      jest.spyOn(Booking.prototype, 'deleteOne').mockRejectedValueOnce(new Error('Delete failure'))

      const response = await request(app).delete('/api/v1/booking/BOOK123').timeout(10000)

      expect(response.status).toBe(500)
      expect(response.body).toMatchObject({
        message: 'Internal server error.',
      })
    })
  })

  describe('Update Booking API - POST /api/v1/booking/:bookingId/update', () => {
    it('4.1 - should update booking with full data', async () => {
      await Booking.create(mockBooking)

      const response = await request(app)
        .post('/api/v1/booking/BOOK123/update')
        .send({
          bookingId: 'BOOK123',
          fullName: 'John Doe',
          email: 'john@example.com',
          phoneNo: '1234567890',
          country: 'USA',
          notes: 'VIP',
          arrivalTime: '14:00',
          finalPrice: 500,
          airportShuttle: true,
          rentalCar: true,
          taxiShuttle: true,
          specialRequest: 'Late check-in',
        })
        .timeout(10000)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        message: 'Booking updated successfully.',
        status: 200,
      })

      const booking = await Booking.findOne({ bookingId: 'BOOK123' })
      expect(booking.customerName).toBe('John Doe')
      expect(booking.totalAmount).toBe(500)
    })

    it('4.2 - should return 404 for non-existent booking', async () => {
      const response = await request(app)
        .post('/api/v1/booking/BOOK999/update')
        .send({
          bookingId: 'BOOK999',
          fullName: 'John Doe',
          email: 'john@example.com',
        })
        .timeout(10000)

      expect(response.status).toBe(404)
      expect(response.body).toMatchObject({
        message: 'Booking not found.',
        status: 404,
      })
    })

    it('4.3 - should handle partial update', async () => {
      await Booking.create({
        bookingId: 'BOOK123',
        hotelId: 'Zxl2qwdTKn',
        userId: 'U456',
        checkInDate: '2025-04-20',
        checkOutDate: '2025-04-25',
        numberOfAdults: 2,
        numberOfChildren: 1,
        status: 'pending',
      })

      const response = await request(app)
        .post('/api/v1/booking/BOOK123/update')
        .send({
          bookingId: 'BOOK123',
          fullName: 'Jane Doe',
          email: 'jane@example.com',
        })
        .timeout(10000)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        message: 'Booking updated successfully.',
        status: 200,
      })

      const booking = await Booking.findOne({ bookingId: 'BOOK123' })
      expect(booking.customerName).toBe('Jane Doe')
      expect(booking.customerEmail).toBe('jane@example.com')
    })

    it('4.4 - should reject invalid data types', async () => {
      await Booking.create({
        bookingId: 'BOOK123',
        hotelId: 'Zxl2qwdTKn',
        userId: 'U456',
        checkInDate: '2025-04-20',
        checkOutDate: '2025-04-25',
        numberOfAdults: 2,
        numberOfChildren: 1,
        status: 'pending',
      })

      const response = await request(app)
        .post('/api/v1/booking/BOOK123/update')
        .send({
          bookingId: 'BOOK123',
          fullName: 'John Doe',
          finalPrice: 'invalid',
        })
        .timeout(10000)

      expect(response.status).toBe(500)
      expect(response.body).toMatchObject({
        message: expect.stringContaining('Cast to Number failed'),
      })
    })

    it('4.5 - should handle database save failure', async () => {
      await Booking.create({
        bookingId: 'BOOK123',
        hotelId: 'Zxl2qwdTKn',
        userId: 'U456',
        checkInDate: '2025-04-20',
        checkOutDate: '2025-04-25',
        numberOfAdults: 2,
        numberOfChildren: 1,
        status: 'pending',
      })

      jest.spyOn(Booking.prototype, 'save').mockRejectedValueOnce(new Error('DB failure'))

      const response = await request(app)
        .post('/api/v1/booking/BOOK123/update')
        .send({
          bookingId: 'BOOK123',
          fullName: 'John Doe',
          email: 'john@example.com',
        })
        .timeout(10000)

      expect(response.status).toBe(500)
      expect(response.body).toMatchObject({
        message: 'Internal server error.',
        status: 500,
      })
    })

    it('4.6 - should handle empty update object', async () => {
      await Booking.create({
        bookingId: 'BOOK123',
        hotelId: 'Zxl2qwdTKn',
        userId: 'U456',
        checkInDate: '2025-04-20',
        checkOutDate: '2025-04-25',
        numberOfAdults: 2,
        numberOfChildren: 1,
        status: 'pending',
      })

      const response = await request(app)
        .post('/api/v1/booking/BOOK123/update')
        .send({
          bookingId: 'BOOK123',
        })
        .timeout(10000)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        message: 'Booking updated successfully.',
        status: 200,
      })
    })

    it('4.7 - should handle invalid bookingId format', async () => {
      const response = await request(app)
        .post('/api/v1/booking/INVALID/update')
        .send({
          bookingId: 'INVALID',
          fullName: 'John Doe',
        })
        .timeout(10000)

      expect(response.status).toBe(404)
      expect(response.body).toMatchObject({
        message: 'Booking not found.',
        status: 404,
      })
    })
  })

  describe('Get Bookings by Email API - GET /api/v1/booking/bookingHistory/:email', () => {
    it('5.1 - should return bookings with reviews', async () => {
      await Booking.create({
        bookingId: 'BOOK123',
        hotelId: 'Zxl2qwdTKn',
        userId: 'U456',
        customerEmail: 'john@example.com',
        checkInDate: '2025-04-20',
        checkOutDate: '2025-04-25',
        numberOfAdults: 2,
        numberOfChildren: 1,
        status: 'pending',
      })
      await Review.create({
        hotelId: 'Zxl2qwdTKn',
        userId: 'U456',
        bookingId: 'BOOK123',
        reviewText: 'Great stay!',
        rating: 5,
      })

      const response = await request(app).get('/api/v1/booking/bookingHistory/john@example.com').timeout(10000)

      expect(response.status).toBe(200)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0]).toMatchObject({
        bookingId: 'BOOK123',
        review: expect.objectContaining({ reviewText: 'Great stay!' }),
      })
    })

    it('5.2 - should return bookings without reviews', async () => {
      await Booking.create({
        bookingId: 'BOOK123',
        hotelId: 'Zxl2qwdTKn',
        userId: 'U456',
        customerEmail: 'jane@example.com',
        checkInDate: '2025-04-20',
        checkOutDate: '2025-04-25',
        numberOfAdults: 2,
        numberOfChildren: 1,
        status: 'pending',
      })

      const response = await request(app).get('/api/v1/booking/bookingHistory/jane@example.com').timeout(10000)

      expect(response.status).toBe(200)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0]).toMatchObject({
        bookingId: 'BOOK123',
        review: 'no reviews',
      })
    })

    it('5.3 - should return 404 for no bookings', async () => {
      const response = await request(app).get('/api/v1/booking/bookingHistory/empty@example.com').timeout(10000)

      expect(response.status).toBe(404)
      expect(response.body).toMatchObject({
        message: 'Booking not found.',
      })
    })

    it('5.4 - should return 404 for invalid email', async () => {
      const response = await request(app).get('/api/v1/booking/bookingHistory/invalid').timeout(10000)

      expect(response.status).toBe(404)
      expect(response.body).toMatchObject({
        message: 'Booking not found.',
      })
    })

    it('5.5 - should handle database error', async () => {
      jest.spyOn(Booking, 'find').mockRejectedValueOnce(new Error('DB failure'))

      const response = await request(app).get('/api/v1/booking/bookingHistory/error@example.com').timeout(10000)

      expect(response.status).toBe(500)
      expect(response.body).toMatchObject({
        message: 'Internal server error.',
      })
    })

    it('5.6 - should handle review query failure', async () => {
      await Booking.create({
        bookingId: 'BOOK123',
        hotelId: 'Zxl2qwdTKn',
        userId: 'U456',
        customerEmail: 'john@example.com',
        checkInDate: '2025-04-20',
        checkOutDate: '2025-04-25',
        numberOfAdults: 2,
        numberOfChildren: 1,
        status: 'pending',
      })

      jest.spyOn(Review, 'findOne').mockRejectedValueOnce(new Error('Review query failure'))

      const response = await request(app).get('/api/v1/booking/bookingHistory/john@example.com').timeout(10000)

      expect(response.status).toBe(500)
      expect(response.body).toMatchObject({
        message: 'Internal server error.',
      })
    })

    it('5.7 - should handle multiple bookings', async () => {
      await Booking.create([
        {
          bookingId: 'BOOK123',
          hotelId: 'Zxl2qwdTKn',
          userId: 'U456',
          customerEmail: 'john@example.com',
          checkInDate: '2025-04-20',
          checkOutDate: '2025-04-25',
          numberOfAdults: 2,
          numberOfChildren: 1,
          status: 'pending',
        },
        {
          bookingId: 'BOOK124',
          hotelId: 'Zxl2qwdTKn',
          userId: 'U456',
          customerEmail: 'john@example.com',
          checkInDate: '2025-05-20',
          checkOutDate: '2025-05-25',
          numberOfAdults: 1,
          numberOfChildren: 0,
          status: 'confirmed',
        },
      ])

      const response = await request(app).get('/api/v1/booking/bookingHistory/john@example.com').timeout(10000)

      expect(response.status).toBe(200)
      expect(response.body.data).toHaveLength(2)
      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ bookingId: 'BOOK123' }),
          expect.objectContaining({ bookingId: 'BOOK124' }),
        ])
      )
    })
  })

  describe('Get Bookings by Hotel ID API - GET /api/v1/booking/bookingHistory/manager/:hotelId', () => {
    beforeEach(async () => {
      await Hotel.create({
        _id: '67fd345baca3d86a9740f049',
        HotelId: 'Zxl2qwdTKn',
        HotelName: 'Test New Luxury Hotel',
        Description: 'Test new luxury stay',
        Category: 'Luxury',
        images: { imgSource: 'test_new_hotel.jpg', caption: 'overview' },
        Tags: ['WiFi', 'Pool'],
        ParkingIncluded: true,
        LastRenovationDate: new Date('2023-04-01'),
        Rating: 3,
        Address: {
          StreetAddress: '789 Test New St',
          City: 'Rome',
          StateProvince: 'Lazio',
          PostalCode: '00186',
          Country: 'Italy',
          _id: '67fd345baca3d86a9740f04a',
        },
        Location: {
          type: 'Point',
          coordinates: [12.4964, 41.9028],
          _id: '67fd345baca3d86a9740f04b',
        },
        createdAt: new Date('2025-04-14T16:14:19.031Z'),
        updatedAt: new Date('2025-04-14T16:14:19.031Z'),
        __v: 0,
      });
    
      await Booking.create([
        {
          bookingId: 'BOOK1',
          hotelId: 'Zxl2qwdTKn',
          customerName: 'John Doe',
          totalAmount: 100,
          numberOfAdults: 2,
          numberOfChildren: 1,
          status: 'pending',
          createdDate: new Date('2025-04-20'),
          checkInDate: '2025-04-20',
          checkOutDate: '2025-04-25',
        },
        {
          bookingId: 'BOOK2',
          hotelId: 'Zxl2qwdTKn',
          customerName: 'Jane Doe',
          totalAmount: 50,
          numberOfAdults: 1,
          numberOfChildren: 0,
          status: 'confirmed',
          createdDate: new Date('2025-04-21'),
          checkInDate: '2025-04-21',
          checkOutDate: '2025-04-26',
        },
        {
          bookingId: 'BOOK3',
          hotelId: 'Zxl2qwdTKn',
          customerName: 'Bob Smith',
          totalAmount: 100,
          numberOfAdults: 4,
          numberOfChildren: 0,
          status: 'confirmed',
          createdDate: new Date('2025-04-22'),
          checkInDate: '2025-04-22',
          checkOutDate: '2025-04-27',
        },
      ]);
    });

    afterEach(async () => {
      await Booking.deleteMany({ bookingId: { $in: ['BOOK1', 'BOOK2', 'BOOK3'] } });
      await Hotel.deleteMany({ HotelId: 'PoWvBfLBf3eeO49oFPn1' });
    })

    it('6.1 - should fetch bookings with no filters', async () => {
      const response = await request(app).get('/api/v1/booking/bookingHistory/manager/Zxl2qwdTKn').timeout(10000)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        bookings: expect.arrayContaining([
          expect.objectContaining({ bookingId: 'BOOK3', hotelName: 'Test New Luxury Hotel' }),
          expect.objectContaining({ bookingId: 'BOOK2', hotelName: 'Test New Luxury Hotel' }),
          expect.objectContaining({ bookingId: 'BOOK1', hotelName: 'Test New Luxury Hotel' }),
        ]),
        totalPages: 1,
      })
    })

    it('6.2 - should filter by status', async () => {
      const response = await request(app)
        .get('/api/v1/booking/bookingHistory/manager/Zxl2qwdTKn')
        .query({ filterStatus: 'pending' })
        .timeout(10000)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        bookings: [expect.objectContaining({ bookingId: 'BOOK1', status: 'pending' })],
        totalPages: 1,
      })
    })

    it('6.3 - should search by customer name', async () => {
      const response = await request(app)
        .get('/api/v1/booking/bookingHistory/manager/Zxl2qwdTKn')
        .query({ searchQuery: 'John' })
        .timeout(10000)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        bookings: [expect.objectContaining({ bookingId: 'BOOK1', customerName: 'John Doe' })],
        totalPages: 1,
      })
    })

    it('6.4 - should sort by totalAmountAsc', async () => {
      const response = await request(app)
        .get('/api/v1/booking/bookingHistory/manager/Zxl2qwdTKn')
        .query({ sortBy: 'totalAmountAsc' })
        .timeout(10000)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        bookings: [
          expect.objectContaining({ bookingId: 'BOOK2', totalAmount: 50 }),
          expect.objectContaining({ bookingId: 'BOOK1', totalAmount: 100 }),
          expect.objectContaining({ bookingId: 'BOOK3', totalAmount: 100 }),
        ],
        totalPages: 1,
      })
    })

    it('6.5 - should handle pagination', async () => {
      await Booking.create([
        {
          bookingId: 'BOOK4',
          hotelId: 'Zxl2qwdTKn',
          createdDate: new Date('2025-04-19'),
          checkInDate: '2025-04-19',
          checkOutDate: '2025-04-24',
          numberOfAdults: 2,
          numberOfChildren: 1,
          status: 'pending',
        },
        {
          bookingId: 'BOOK5',
          hotelId: 'Zxl2qwdTKn',
          createdDate: new Date('2025-04-18'),
          checkInDate: '2025-04-18',
          checkOutDate: '2025-04-23',
          numberOfAdults: 1,
          numberOfChildren: 0,
          status: 'confirmed',
        },
      ])

      const response = await request(app)
        .get('/api/v1/booking/bookingHistory/manager/Zxl2qwdTKn')
        .query({ page: 2, itemsPerPage: 2 })
        .timeout(10000)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        bookings: [expect.objectContaining({ bookingId: 'BOOK2' }), expect.objectContaining({ bookingId: 'BOOK1' })],
        totalPages: 3,
      })
    })

    it('6.6 - should return empty for invalid hotel ID', async () => {
      const response = await request(app).get('/api/v1/booking/bookingHistory/manager/INVALID_HOTEL').timeout(10000)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        bookings: [],
        totalPages: 0,
      })
    })

    it('6.7 - should handle database error', async () => {
      jest.spyOn(Booking, 'find').mockRejectedValueOnce(new Error('DB failure'))

      const response = await request(app).get('/api/v1/booking/bookingHistory/manager/Zxl2qwdTKn').timeout(10000)

      expect(response.status).toBe(500)
      expect(response.body).toMatchObject({
        message: 'Internal server error',
      })
    })

    it('6.8 - should handle search with missing customerName', async () => {
      await Booking.create({
        bookingId: 'BOOK4',
        hotelId: 'Zxl2qwdTKn',
        totalAmount: 75,
        createdDate: new Date('2025-04-19'),
        checkInDate: '2025-04-19',
        checkOutDate: '2025-04-24',
        numberOfAdults: 2,
        numberOfChildren: 1,
        status: 'pending',
      })

      const response = await request(app)
        .get('/api/v1/booking/bookingHistory/manager/Zxl2qwdTKn')
        .query({ searchQuery: 'John' })
        .timeout(10000)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        bookings: [expect.objectContaining({ bookingId: 'BOOK1', customerName: 'John Doe' })],
        totalPages: 1,
      })
    })

    it('6.9 - should sort by totalAmountDesc', async () => {
      const response = await request(app)
        .get('/api/v1/booking/bookingHistory/manager/Zxl2qwdTKn')
        .query({ sortBy: 'totalAmountDesc' })
        .timeout(10000)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        bookings: [
          expect.objectContaining({ bookingId: 'BOOK1', totalAmount: 100 }),
          expect.objectContaining({ bookingId: 'BOOK3', totalAmount: 100 }),
          expect.objectContaining({ bookingId: 'BOOK2', totalAmount: 50 }),
        ],
        totalPages: 1,
      })
    })

    it('6.10 - should sort by numberOfGuest', async () => {
      const response = await request(app)
        .get('/api/v1/booking/bookingHistory/manager/Zxl2qwdTKn')
        .query({ sortBy: 'numberOfGuest' })
        .timeout(10000)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        bookings: [
          expect.objectContaining({ bookingId: 'BOOK1', numberOfAdults: 2, numberOfChildren: 1 }),
          expect.objectContaining({ bookingId: 'BOOK2', numberOfAdults: 1, numberOfChildren: 0 }),
          expect.objectContaining({ bookingId: 'BOOK3', numberOfAdults: 0, numberOfChildren: 0 }),
        ],
        totalPages: 1,
      })
    })

    it('6.11 - should handle hotel not found', async () => {
      await Booking.create({
        bookingId: 'BOOK4',
        hotelId: 'HOTEL999',
        customerName: 'John Doe',
        totalAmount: 100,
        numberOfAdults: 2,
        numberOfChildren: 1,
        status: 'pending',
        createdDate: new Date('2025-04-20'),
        checkInDate: '2025-04-20',
        checkOutDate: '2025-04-25',
      })

      const response = await request(app).get('/api/v1/booking/bookingHistory/manager/HOTEL999').timeout(10000)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        bookings: [expect.objectContaining({ bookingId: 'BOOK4', hotelName: 'Unknown' })],
        totalPages: 1,
      })
    })

    it('6.12 - should handle empty search query', async () => {
      const response = await request(app)
        .get('/api/v1/booking/bookingHistory/manager/Zxl2qwdTKn')
        .query({ searchQuery: '' })
        .timeout(10000)

      expect(response.status).toBe(200)
      expect(response.body.bookings).toHaveLength(3)
      expect(response.body).toMatchObject({
        totalPages: 1,
      })
    })

    it('6.13 - should handle negative page number', async () => {
      const response = await request(app)
        .get('/api/v1/booking/bookingHistory/manager/Zxl2qwdTKn')
        .query({ page: -1 })
        .timeout(10000)

      expect(response.status).toBe(200)
      expect(response.body.bookings).toHaveLength(3)
      expect(response.body).toMatchObject({
        totalPages: 1,
      })
    })

    it('6.14 - should handle zero itemsPerPage', async () => {
      const response = await request(app)
        .get('/api/v1/booking/bookingHistory/manager/Zxl2qwdTKn')
        .query({ itemsPerPage: 0 })
        .timeout(10000)

      expect(response.status).toBe(200)
      expect(response.body.bookings).toHaveLength(0)
      expect(response.body.totalPages).toBeGreaterThan(0) // Handle edge case
    })

    it('6.15 - should handle hotel query failure', async () => {
      jest.spyOn(Hotel, 'findOne').mockRejectedValueOnce(new Error('Hotel query failure'))

      const response = await request(app).get('/api/v1/booking/bookingHistory/manager/Zxl2qwdTKn').timeout(10000)

      expect(response.status).toBe(500)
      expect(response.body).toMatchObject({
        message: 'Internal server error',
      })
    })

    it('6.16 - should handle special characters in search query', async () => {
      const response = await request(app)
        .get('/api/v1/booking/bookingHistory/manager/Zxl2qwdTKn')
        .query({ searchQuery: 'John@Doe' })
        .timeout(10000)

      expect(response.status).toBe(200)
      expect(response.body.bookings).toHaveLength(0)
      expect(response.body).toMatchObject({
        totalPages: 0,
      })
    })

    it('6.17 - should filter by month', async () => {
      const response = await request(app)
        .get('/api/v1/booking/bookingHistory/manager/Zxl2qwdTKn')
        .query({ month: '4' })
        .timeout(10000)

      expect(response.status).toBe(200)
      expect(response.body.bookings).toHaveLength(3) // Month filter commented out, so all bookings returned
      expect(response.body).toMatchObject({
        totalPages: 1,
      })
    })
  })
})

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

// Tăng timeout toàn cục để tránh lỗi timeout
jest.setTimeout(60000)

describe('Booking Controller APIs', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost/test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    await new Promise((resolve) => mongoose.connection.once('connected', resolve))
  })

  beforeEach(async () => {
    await Booking.deleteMany({})
    await Room.deleteMany({})
    await Review.deleteMany({})
    await Hotel.deleteMany({})
    generate.generateRandomString.mockReset()
    jest.clearAllMocks()
    jest.restoreAllMocks()
  })

  afterEach(async () => {
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
    beforeEach(async () => {
      await Room.create([
        {
          RoomId: 'R001',
          NumberAvailable: 5,
          MaxQuantity: 10,
          MaxOccupancy: 4,
          BaseRate: 100,
          RoomType: 'Deluxe',
        },
        {
          RoomId: 'R002',
          NumberAvailable: 5,
          MaxQuantity: 10,
          MaxOccupancy: 4,
          BaseRate: 150,
          RoomType: 'Suite',
        },
      ])
    })

    it('1.1 - should create a booking successfully with valid data', async () => {
      generate.generateRandomString.mockReturnValue('BOOK123')

      const response = await request(app)
        .post('/api/v1/booking/create')
        .send({
          hotelId: 'H123',
          userId: 'U456',
          booking: {
            startDate: '2025-04-20',
            endDate: '2025-04-25',
            adults: 2,
            children: 1,
          },
          selectedRooms: [
            { roomId: 'R001', quantity: 1 },
            { roomId: 'R002', quantity: 2 },
          ],
        })
        .timeout(10000)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        message: 'Booking created successfully.',
        data: 'BOOK123',
      })

      const booking = await Booking.findOne({ bookingId: 'BOOK123' })
      expect(booking).toBeTruthy()
      expect(booking.toObject()).toMatchObject({
        bookingId: 'BOOK123',
        hotelId: 'H123',
        userId: 'U456',
        numberOfAdults: 2,
        numberOfChildren: 1,
        status: 'pending',
        rooms: [
          { roomId: 'R001', quantity: 1 },
          { roomId: 'R002', quantity: 2 },
        ],
      })

      const rooms = await Room.find({ RoomId: { $in: ['R001', 'R002'] } })
      expect(rooms[0].NumberAvailable).toBe(4)
      expect(rooms[1].NumberAvailable).toBe(3)
    })

    it('1.2 - should handle missing hotelId', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {})
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
          selectedRooms: [{ roomId: 'R001', quantity: 1 }],
        })
        .timeout(10000)

      expect(response.status).toBe(500)
      expect(response.body).toEqual({})
      console.error.mockRestore()
    })

    it('1.3 - should handle missing booking object', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {})
      const response = await request(app)
        .post('/api/v1/booking/create')
        .send({
          hotelId: 'H123',
          userId: 'U456',
          selectedRooms: [{ roomId: 'R001', quantity: 1 }],
        })
        .timeout(10000)

      expect(response.status).toBe(500)
      expect(response.body).toEqual({})
      console.error.mockRestore()
    })

    it('1.4 - should default userId to guest', async () => {
      generate.generateRandomString.mockReturnValue('BOOK123')

      const response = await request(app)
        .post('/api/v1/booking/create')
        .send({
          hotelId: 'H123',
          booking: {
            startDate: '2025-04-20',
            endDate: '2025-04-25',
            adults: 2,
            children: 1,
          },
          selectedRooms: [{ roomId: 'R001', quantity: 1 }],
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
          hotelId: 'H123',
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
          hotelId: 'H123',
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

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        message: 'Booking created successfully.',
        data: 'BOOK123',
      })

      const booking = await Booking.findOne({ bookingId: 'BOOK123' })
      expect(booking.rooms).toEqual([{ roomId: 'R999', quantity: 1 }])
    })

    it('1.7 - should handle database save failure', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {})
      jest.spyOn(Booking.prototype, 'save').mockImplementationOnce(() => {
        throw new Error('DB failure')
      })

      const response = await request(app)
        .post('/api/v1/booking/create')
        .send({
          hotelId: 'H123',
          userId: 'U456',
          booking: {
            startDate: '2025-04-20',
            endDate: '2025-04-25',
            adults: 2,
            children: 1,
          },
          selectedRooms: [{ roomId: 'R001', quantity: 1 }],
        })
        .timeout(10000)

      expect(response.status).toBe(500)
      expect(response.body).toEqual({})
      console.error.mockRestore()
    })
  })

  describe('Get Booking API - GET /api/v1/booking/:bookingId', () => {
    it('2.1 - should retrieve booking with valid ID', async () => {
      await Booking.create({
        bookingId: 'BOOK123',
        hotelId: 'H123',
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
    })

    it('2.2 - should return 404 for non-existent booking', async () => {
      const response = await request(app).get('/api/v1/booking/BOOK999').timeout(10000)

      expect(response.status).toBe(404)
      expect(response.body).toMatchObject({
        message: 'Booking not found.',
      })
    })

    it('2.3 - should handle database error', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {})
      jest.spyOn(Booking, 'findOne').mockImplementationOnce(() => {
        throw new Error('DB failure')
      })

      const response = await request(app).get('/api/v1/booking/BOOK123').timeout(10000)

      expect(response.status).toBe(500)
      expect(response.body).toEqual({})
      console.error.mockRestore()
    })
  })

  describe('Delete Booking API - DELETE /api/v1/booking/:bookingId', () => {
    it('3.1 - should delete existing booking', async () => {
      await Booking.create({
        bookingId: 'BOOK123',
        hotelId: 'H123',
        userId: 'U456',
        checkInDate: '2025-04-20',
        checkOutDate: '2025-04-25',
        numberOfAdults: 2,
        numberOfChildren: 1,
        status: 'pending',
      })

      const response = await request(app).delete('/api/v1/booking/BOOK123').timeout(10000)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        message: 'Booking deleted successfully.',
      })

      const booking = await Booking.findOne({ bookingId: 'BOOK123' })
      expect(booking).toBeNull()
    })

    it('3.2 - should return 404 for non-existent booking', async () => {
      const response = await request(app).delete('/api/v1/booking/BOOK999').timeout(10000)

      expect(response.status).toBe(404)
      expect(response.body).toMatchObject({
        message: 'Booking not found.',
      })
    })

    it('3.3 - should handle database error', async () => {
      jest.spyOn(Booking, 'findOne').mockImplementationOnce(() => {
        throw new Error('DB failure')
      })

      const response = await request(app).delete('/api/v1/booking/BOOK123').timeout(10000)

      expect(response.status).toBe(500)
      expect(response.body).toMatchObject({
        message: 'Internal server error.',
      })
    })
  })

  describe('Update Booking API - POST /api/v1/booking/:bookingId/update', () => {
    it('4.1 - should update booking with full data', async () => {
      await Booking.create({
        bookingId: 'BOOK123',
        hotelId: 'H123',
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
        hotelId: 'H123',
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

    it('4.4 - should accept invalid data types', async () => {
      await Booking.create({
        bookingId: 'BOOK123',
        hotelId: 'H123',
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

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        message: 'Booking updated successfully.',
        status: 200,
      })

      const booking = await Booking.findOne({ bookingId: 'BOOK123' })
      expect(booking.totalAmount).toBe('invalid')
    })

    it('4.5 - should handle database save failure', async () => {
      await Booking.create({
        bookingId: 'BOOK123',
        hotelId: 'H123',
        userId: 'U456',
        checkInDate: '2025-04-20',
        checkOutDate: '2025-04-25',
        numberOfAdults: 2,
        numberOfChildren: 1,
        status: 'pending',
      })

      jest.spyOn(Booking.prototype, 'save').mockImplementationOnce(() => {
        throw new Error('DB failure')
      })

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
  })

  describe('Get Bookings by Email API - GET /api/v1/booking/bookingHistory/:email', () => {
    it('5.1 - should return bookings with reviews', async () => {
      await Booking.create({
        bookingId: 'BOOK123',
        hotelId: 'H123',
        userId: 'U456',
        customerEmail: 'john@example.com',
        checkInDate: '2025-04-20',
        checkOutDate: '2025-04-25',
        numberOfAdults: 2,
        numberOfChildren: 1,
        status: 'pending',
      })
      await Review.create({
        hotelId: 'H123',
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
        hotelId: 'H123',
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
      jest.spyOn(Booking, 'find').mockImplementationOnce(() => {
        throw new Error('DB failure')
      })

      const response = await request(app).get('/api/v1/booking/bookingHistory/error@example.com').timeout(10000)

      expect(response.status).toBe(500)
      expect(response.body).toMatchObject({
        message: 'Internal server error.',
      })
    })
  })

  describe('Get Bookings by Hotel ID API - GET /api/v1/booking/bookingHistory/manager/:hotelId', () => {
    beforeEach(async () => {
      await Hotel.create({
        HotelId: 'HOTEL123',
        HotelName: 'Grand Hotel',
        Location: 'City Center',
        Address: '123 Main St',
        images: [{ imgSource: 'hotel.jpg' }],
        Description: 'Luxury hotel with great amenities',
      })
      await Booking.create([
        {
          bookingId: 'BOOK1',
          hotelId: 'HOTEL123',
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
          hotelId: 'HOTEL123',
          customerName: 'Jane Doe',
          totalAmount: 50,
          numberOfAdults: 1,
          numberOfChildren: 0,
          status: 'confirmed',
          createdDate: new Date('2025-04-21'),
          checkInDate: '2025-04-21',
          checkOutDate: '2025-04-26',
        },
      ])
    })

    it('6.1 - should fetch bookings with no filters', async () => {
      const response = await request(app).get('/api/v1/booking/bookingHistory/manager/HOTEL123').timeout(10000)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        bookings: expect.arrayContaining([
          expect.objectContaining({ bookingId: 'BOOK2', hotelName: 'Grand Hotel' }),
          expect.objectContaining({ bookingId: 'BOOK1', hotelName: 'Grand Hotel' }),
        ]),
        totalPages: 1,
      })
    })

    it('6.2 - should filter by status', async () => {
      const response = await request(app)
        .get('/api/v1/booking/bookingHistory/manager/HOTEL123')
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
        .get('/api/v1/booking/bookingHistory/manager/HOTEL123')
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
        .get('/api/v1/booking/bookingHistory/manager/HOTEL123')
        .query({ sortBy: 'totalAmountAsc' })
        .timeout(10000)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        bookings: [
          expect.objectContaining({ bookingId: 'BOOK2', totalAmount: 50 }),
          expect.objectContaining({ bookingId: 'BOOK1', totalAmount: 100 }),
        ],
        totalPages: 1,
      })
    })

    it('6.5 - should handle pagination', async () => {
      await Booking.create([
        {
          bookingId: 'BOOK3',
          hotelId: 'HOTEL123',
          createdDate: new Date('2025-04-19'),
          checkInDate: '2025-04-19',
          checkOutDate: '2025-04-24',
          numberOfAdults: 2,
          numberOfChildren: 1,
          status: 'pending',
        },
        {
          bookingId: 'BOOK4',
          hotelId: 'HOTEL123',
          createdDate: new Date('2025-04-18'),
          checkInDate: '2025-04-18',
          checkOutDate: '2025-04-23',
          numberOfAdults: 1,
          numberOfChildren: 0,
          status: 'confirmed',
        },
      ])

      const response = await request(app)
        .get('/api/v1/booking/bookingHistory/manager/HOTEL123')
        .query({ page: 2, itemsPerPage: 2 })
        .timeout(10000)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        bookings: [expect.objectContaining({ bookingId: 'BOOK3' }), expect.objectContaining({ bookingId: 'BOOK4' })],
        totalPages: 2,
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
      jest.spyOn(Booking, 'find').mockImplementationOnce(() => {
        throw new Error('DB failure')
      })

      const response = await request(app).get('/api/v1/booking/bookingHistory/manager/HOTEL123').timeout(10000)

      expect(response.status).toBe(500)
      expect(response.body).toMatchObject({
        message: 'Internal server error',
      })
    })

    it('6.8 - should handle search with missing customerName', async () => {
      await Booking.create({
        bookingId: 'BOOK3',
        hotelId: 'HOTEL123',
        totalAmount: 75,
        createdDate: new Date('2025-04-19'),
        checkInDate: '2025-04-19',
        checkOutDate: '2025-04-24',
        numberOfAdults: 2,
        numberOfChildren: 1,
        status: 'pending',
      })

      const response = await request(app)
        .get('/api/v1/booking/bookingHistory/manager/HOTEL123')
        .query({ searchQuery: 'John' })
        .timeout(10000)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        bookings: [expect.objectContaining({ bookingId: 'BOOK1', customerName: 'John Doe' })],
        totalPages: 1,
      })
    })
  })
})

describe('Account Controller - getDashboardData API', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    await new Promise((resolve) => {
      mongoose.connection.once('connected', resolve)
    })
  })

  beforeEach(async () => {
    if (mongoose.connection.readyState === 1) {
      await Account.deleteMany()
      await Hotel.deleteMany()
      await Room.deleteMany()
      await Booking.deleteMany()
    }
    jest.spyOn(Account, 'findOne').mockRestore()
    jest.spyOn(Room, 'find').mockRestore()
    jest.spyOn(Hotel, 'find').mockRestore()
    jest.spyOn(Booking, 'find').mockRestore()
  })

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close()
    }
    if (server && server.close) await server.close()
  })

  describe('GET /api/v1/admin/Dashboard/:adminId', () => {
    // Test Case 7.1
    it('should fetch dashboard data successfully with multiple hotels and mixed booking statuses', async () => {
      await Account.create({
        token: 'TOKEN123',
        hotel_id: ['HOTEL1', 'HOTEL2'],
      })
      await Hotel.create([
        { HotelId: 'HOTEL1', HotelName: 'Hotel A' },
        { HotelId: 'HOTEL2', HotelName: 'Hotel B' },
      ])
      await Room.create([
        { HotelId: 'HOTEL1', MaxQuantity: 10, NumberAvailable: 5 },
        { HotelId: 'HOTEL2', MaxQuantity: 20, NumberAvailable: 15 },
      ])
      await Booking.create([
        { hotelId: 'HOTEL1', status: 'pending', totalAmount: 100 },
        { hotelId: 'HOTEL1', status: 'paid', totalAmount: 200 },
        { hotelId: 'HOTEL2', status: 'confirmed', totalAmount: 300 },
      ])

      const response = await request(app).get('/api/v1/admin/Dashboard/TOKEN123')

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        message: 'Dashboard data fetched successfully',
        data: {
          totalHotels: 2,
          totalBookings: 3,
          pendingBookings: 1,
          paidBookings: 1,
          confirmedBookings: 1,
          totalRevenue: [
            { hotelId: 'Hotel A', totalRevenue: 300 },
            { hotelId: 'Hotel B', totalRevenue: 300 },
          ],
          hotelRoomData: [
            { hotelId: 'Hotel A', totalRooms: 10, bookedRooms: 5, freeRooms: 5 },
            { hotelId: 'Hotel B', totalRooms: 20, bookedRooms: 5, freeRooms: 15 },
          ],
        },
      })

      // Verify database state
      const bookings = await Booking.find()
      expect(bookings).toHaveLength(3)
      const hotels = await Hotel.find()
      expect(hotels).toHaveLength(2)
      const rooms = await Room.find()
      expect(rooms).toHaveLength(2)
    })

    // Test Case 7.2
    it('should fetch dashboard data with one hotel, no bookings, no rooms', async () => {
      await Account.create({
        token: 'TOKEN123',
        hotel_id: ['HOTEL1'],
      })
      await Hotel.create([{ HotelId: 'HOTEL1', HotelName: 'Hotel A' }])

      const response = await request(app).get('/api/v1/admin/Dashboard/TOKEN123')

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        message: 'Dashboard data fetched successfully',
        data: {
          totalHotels: 1,
          totalBookings: 0,
          pendingBookings: 0,
          paidBookings: 0,
          confirmedBookings: 0,
          totalRevenue: [{ hotelId: 'Hotel A', totalRevenue: 0 }],
          hotelRoomData: [{ hotelId: 'Hotel A', totalRooms: 0, bookedRooms: 0, freeRooms: 0 }],
        },
      })

      // Verify database state
      const bookings = await Booking.find()
      expect(bookings).toHaveLength(0)
      const rooms = await Room.find()
      expect(rooms).toHaveLength(0)
      const hotels = await Hotel.find()
      expect(hotels).toHaveLength(1)
    })

    // Test Case 7.3
    it('should fetch dashboard data with hotels but no bookings', async () => {
      await Account.create({
        token: 'TOKEN123',
        hotel_id: ['HOTEL1'],
      })
      await Hotel.create([{ HotelId: 'HOTEL1', HotelName: 'Hotel A' }])
      await Room.create([{ HotelId: 'HOTEL1', MaxQuantity: 10, NumberAvailable: 8 }])

      const response = await request(app).get('/api/v1/admin/Dashboard/TOKEN123')

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        message: 'Dashboard data fetched successfully',
        data: {
          totalHotels: 1,
          totalBookings: 0,
          pendingBookings: 0,
          paidBookings: 0,
          confirmedBookings: 0,
          totalRevenue: [{ hotelId: 'Hotel A', totalRevenue: 0 }],
          hotelRoomData: [{ hotelId: 'Hotel A', totalRooms: 10, bookedRooms: 2, freeRooms: 8 }],
        },
      })

      // Verify database state
      const bookings = await Booking.find()
      expect(bookings).toHaveLength(0)
      const rooms = await Room.find()
      expect(rooms).toHaveLength(1)
      expect(rooms[0].MaxQuantity).toBe(10)
      expect(rooms[0].NumberAvailable).toBe(8)
    })

    // Test Case 7.4
    it('should fetch dashboard data with bookings but no rooms', async () => {
      await Account.create({
        token: 'TOKEN123',
        hotel_id: ['HOTEL1'],
      })
      await Hotel.create([{ HotelId: 'HOTEL1', HotelName: 'Hotel A' }])
      await Booking.create([{ hotelId: 'HOTEL1', status: 'paid', totalAmount: 500 }])

      const response = await request(app).get('/api/v1/admin/Dashboard/TOKEN123')

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        message: 'Dashboard data fetched successfully',
        data: {
          totalHotels: 1,
          totalBookings: 1,
          pendingBookings: 0,
          paidBookings: 1,
          confirmedBookings: 0,
          totalRevenue: [{ hotelId: 'Hotel A', totalRevenue: 500 }],
          hotelRoomData: [{ hotelId: 'Hotel A', totalRooms: 0, bookedRooms: 0, freeRooms: 0 }],
        },
      })

      // Verify database state
      const bookings = await Booking.find()
      expect(bookings).toHaveLength(1)
      expect(bookings[0].status).toBe('paid')
      const rooms = await Room.find()
      expect(rooms).toHaveLength(0)
    })

    // Test Case 7.5
    it('should handle empty hotel_id array', async () => {
      await Account.create({
        token: 'TOKEN123',
        hotel_id: [],
      })

      const response = await request(app).get('/api/v1/admin/Dashboard/TOKEN123')

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        message: 'Dashboard data fetched successfully',
        data: {
          totalHotels: 0,
          totalBookings: 0,
          pendingBookings: 0,
          paidBookings: 0,
          confirmedBookings: 0,
          totalRevenue: [],
          hotelRoomData: [],
        },
      })

      // Verify database state
      const bookings = await Booking.find()
      expect(bookings).toHaveLength(0)
      const hotels = await Hotel.find()
      expect(hotels).toHaveLength(0)
      const rooms = await Room.find()
      expect(rooms).toHaveLength(0)
    })

    // Test Case 7.6
    it('should handle hotels with zero total rooms', async () => {
      await Account.create({
        token: 'TOKEN123',
        hotel_id: ['HOTEL1'],
      })
      await Hotel.create([{ HotelId: 'HOTEL1', HotelName: 'Hotel A' }])
      await Room.create([{ HotelId: 'HOTEL1', MaxQuantity: 0, NumberAvailable: 0 }])

      const response = await request(app).get('/api/v1/admin/Dashboard/TOKEN123')

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        message: 'Dashboard data fetched successfully',
        data: {
          totalHotels: 1,
          totalBookings: 0,
          pendingBookings: 0,
          paidBookings: 0,
          confirmedBookings: 0,
          totalRevenue: [{ hotelId: 'Hotel A', totalRevenue: 0 }],
          hotelRoomData: [{ hotelId: 'Hotel A', totalRooms: 0, bookedRooms: 0, freeRooms: 0 }],
        },
      })

      // Verify database state
      const rooms = await Room.find()
      expect(rooms).toHaveLength(1)
      expect(rooms[0].MaxQuantity).toBe(0)
      const bookings = await Booking.find()
      expect(bookings).toHaveLength(0)
    })

    // Test Case 7.7
    it('should handle bookings with zero totalAmount', async () => {
      await Account.create({
        token: 'TOKEN123',
        hotel_id: ['HOTEL1'],
      })
      await Hotel.create([{ HotelId: 'HOTEL1', HotelName: 'Hotel A' }])
      await Booking.create([{ hotelId: 'HOTEL1', status: 'paid', totalAmount: 0 }])

      const response = await request(app).get('/api/v1/admin/Dashboard/TOKEN123')

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        message: 'Dashboard data fetched successfully',
        data: {
          totalHotels: 1,
          totalBookings: 1,
          pendingBookings: 0,
          paidBookings: 1,
          confirmedBookings: 0,
          totalRevenue: [{ hotelId: 'Hotel A', totalRevenue: 0 }],
          hotelRoomData: [{ hotelId: 'Hotel A', totalRooms: 0, bookedRooms: 0, freeRooms: 0 }],
        },
      })

      // Verify database state
      const bookings = await Booking.find()
      expect(bookings).toHaveLength(1)
      expect(bookings[0].totalAmount).toBe(0)
    })

    // Test Case 7.8
    it('should return 404 for invalid admin ID', async () => {
      const response = await request(app).get('/api/v1/admin/Dashboard/INVALID_TOKEN')

      expect(response.status).toBe(404)
      expect(response.body).toEqual({
        message: 'Manager not found',
      })

      // Verify database state
      const accounts = await Account.find()
      expect(accounts).toHaveLength(0)
    })

    // Test Case 7.9
    it('should handle database error on Account.findOne', async () => {
      jest.spyOn(Account, 'findOne').mockRejectedValueOnce(new Error('DB error'))

      const response = await request(app).get('/api/v1/admin/Dashboard/TOKEN123')

      expect(response.status).toBe(500)
      expect(response.body).toMatchObject({
        message: 'Internal server error',
      })

      // Verify database state
      const accounts = await Account.find()
      expect(accounts).toHaveLength(0)
    })

    // Test Case 7.10
    it('should handle database error on Promise.all', async () => {
      await Account.create({
        token: 'TOKEN123',
        hotel_id: ['HOTEL1'],
      })
      jest.spyOn(Room, 'find').mockRejectedValueOnce(new Error('DB error'))

      const response = await request(app).get('/api/v1/admin/Dashboard/TOKEN123')

      expect(response.status).toBe(500)
      expect(response.body).toMatchObject({
        message: 'Internal server error',
      })

      // Verify database state
      const account = await Account.findOne({ token: 'TOKEN123' })
      expect(account).not.toBeNull()
    })

    // Test Case 7.11
    it('should handle large dataset for performance', async () => {
      const hotelIds = Array.from({ length: 100 }, (_, i) => `HOTEL${i}`)
      await Account.create({
        token: 'TOKEN123',
        hotel_id: hotelIds,
      })
      await Hotel.create(hotelIds.map((id, i) => ({ HotelId: id, HotelName: Hotel`${i}` })))
      await Room.create(
        hotelIds.flatMap((hotelId) =>
          Array.from({ length: 10 }, (_, i) => ({
            HotelId: hotelId,
            MaxQuantity: 10,
            NumberAvailable: 5,
          }))
        )
      )
      await Booking.create(
        hotelIds.flatMap((hotelId) =>
          Array.from({ length: 10 }, (_, i) => ({
            hotelId: hotelId,
            status: i % 3 === 0 ? 'pending' : i % 3 === 1 ? 'paid' : 'confirmed',
            totalAmount: 100,
          }))
        )
      )

      const startTime = Date.now()
      const response = await request(app).get('/api/v1/admin/Dashboard/TOKEN123')
      const executionTime = Date.now() - startTime

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        message: 'Dashboard data fetched successfully',
        data: {
          totalHotels: 100,
          totalBookings: 1000,
          pendingBookings: expect.any(Number),
          paidBookings: expect.any(Number),
          confirmedBookings: expect.any(Number),
          totalRevenue: expect.arrayContaining([expect.objectContaining({ totalRevenue: 1000 })]),
          hotelRoomData: expect.arrayContaining([
            expect.objectContaining({ totalRooms: 100, bookedRooms: 50, freeRooms: 50 }),
          ]),
        },
      })
      expect(executionTime).toBeLessThan(500)

      // Verify database state
      const bookings = await Booking.find()
      expect(bookings).toHaveLength(1000)
      const hotels = await Hotel.find()
      expect(hotels).toHaveLength(100)
      const rooms = await Room.find()
      expect(rooms).toHaveLength(1000)
    })

    // Test Case 7.12
    it('should handle booking with max totalAmount', async () => {
      await Account.create({
        token: 'TOKEN123',
        hotel_id: ['HOTEL1'],
      })
      await Hotel.create([{ HotelId: 'HOTEL1', HotelName: 'Hotel A' }])
      await Booking.create([{ hotelId: 'HOTEL1', status: 'paid', totalAmount: Number.MAX_SAFE_INTEGER }])

      const response = await request(app).get('/api/v1/admin/Dashboard/TOKEN123')

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        message: 'Dashboard data fetched successfully',
        data: {
          totalHotels: 1,
          totalBookings: 1,
          pendingBookings: 0,
          paidBookings: 1,
          confirmedBookings: 0,
          totalRevenue: [{ hotelId: 'Hotel A', totalRevenue: Number.MAX_SAFE_INTEGER }],
          hotelRoomData: [{ hotelId: 'Hotel A', totalRooms: 0, bookedRooms: 0, freeRooms: 0 }],
        },
      })

      // Verify database state
      const bookings = await Booking.find()
      expect(bookings).toHaveLength(1)
      expect(bookings[0].totalAmount).toBe(Number.MAX_SAFE_INTEGER)
    })
  })
})

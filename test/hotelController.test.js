const mongoose = require('mongoose');
const Hotel = require('../models/hotelDetail.model'); // Đường dẫn đến model Hotel
const Room = require('../models/room.model');   // Đường dẫn đến model Room
const Booking = require('../models/booking.model'); // Đường dẫn đến model Booking
const { search, getHotelById, getHotelStatistics, updateHotelInfo, createHotel, deleteHotel, getHotelRooms, updateRoomInfo, deleteRoom } = require('../api/v1/controller/hotel.controller'); // Đường dẫn đến controller
const { app, server } = require('../index')
const request = require('supertest');
const { json } = require('body-parser');
const fs = require('fs');

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
}, 10000);

afterAll(async () => {
    await cleanData();
    await mongoose.connection.close();
    if (server && server.close) await server.close();
});

const mockHotelData = {
    HotelId: "TEST_HOTEL_001",
    HotelName: "Test Paris Luxury Hotel",
    Description: "Test luxury stay in Paris",
    Category: "5-Star",
    images: {
        caption: "Test Hotel Overview",
        imgSource: "http://example.com/test_hotel.jpg",
    },
    Tags: ["WiFi", "Pool"],
    ParkingIncluded: true,
    LastRenovationDate: new Date("2023-01-01"),
    Rating: 4.5,
    Address: {
        StreetAddress: "123 Test Rue de Rivoli",
        City: "Paris",
        StateProvince: "Île-de-France",
        PostalCode: "75001",
        Country: "France",
    },
    Location: {
        type: "Point",
        coordinates: [48.8566, 2.3522],
    },
};

const mockRoomData = {
    RoomId: "TEST_ROOM_001",
    HotelId: "TEST_HOTEL_001",
    RoomType: "Deluxe",
    Description: "Test spacious room",
    BaseRate: 200,
    Discount: 10,
    BedOptions: "King",
    MaxOccupancy: 2,
    RoomTags: ["WiFi", "Pool"],
    NumberAvailable: 5,
    MaxQuantity: 10,
    Images: {
        url: "http://example.com/test_room.jpg",
        description: "Test Deluxe Room",
    },
};

const mockBookingData = {
    bookingId: "TEST_BOOKING_001",
    hotelId: "TEST_HOTEL_001",
    userId: "TEST_USER_001",
    customerName: "Test John Doe",
    customerEmail: "test.john.doe@example.com",
    customerPhone: "+33123456789",
    customerCountry: "France",
    airportShuttle: false,
    rentalCar: false,
    rentalCarPrice: 0,
    taxiShuttlePrice: 0,
    taxiShuttle: false,
    specialRequest: "No special requests",
    bookingDate: new Date(),
    checkInDate: new Date(),
    checkOutDate: new Date(new Date().getTime() + 24 * 60 * 60 * 1000), // Ngày mai
    totalAmount: 180,
    arrivalTime: "14:00",
    rooms: [{
        roomId: "TEST_ROOM_001",
        quantity: 1,
    }],
    status: "Confirmed",
    numberOfAdults: 2,
    numberOfChildren: 0,
};

// Hàm seeding dữ liệu
const seedData = async () => {
    await Hotel.create(mockHotelData);

    await Room.create(mockRoomData);

    await Booking.create(mockBookingData);

    await Hotel.create({
        HotelId: "TEST_HOTEL_002",
        HotelName: "Test London Budget Hotel",
        Description: "Test budget stay in London",
        Category: "2-Star",
        images: {
            caption: "Test Budget Overview",
            imgSource: "http://example.com/test_budget.jpg",
        },
        Tags: ["WiFi"],
        ParkingIncluded: false,
        LastRenovationDate: new Date("2022-06-01"),
        Rating: 3.0,
        Address: {
            StreetAddress: "456 Test Baker St",
            City: "London",
            StateProvince: "England",
            PostalCode: "NW1 6XE",
            Country: "UK",
        },
        Location: {
            type: "Point",
            coordinates: [51.5236, -0.1580],
        },
    });
};

const cleanData = async () => {
    // Delete all test hotels, including dynamically created ones
    await Hotel.deleteMany({
        HotelId: {
            $in: [
                "TEST_HOTEL_001",
                "TEST_HOTEL_002",
                "TEST_HOTEL_ERROR_UPDATE",
                "TEST_HOTEL_ERROR_ROOM",
                "TEST_HOTEL_ERROR_DELETE",
                "MOCK_HOTEL_ID",
            ],
        },
    });
    // Delete hotels created during tests (e.g., by Create Hotel API)
    await Hotel.deleteMany({
        HotelName: {
            $in: [
                "Test New Luxury Hotel",
                "Test Budget Inn",
                "Test Roadside Inn",
                "Test Downtown Stay",
                // Add other hotel names created in tests
            ],
        },
    });

    await Room.deleteMany({
        RoomId: {
            $in: [
                "TEST_ROOM_001",
                "TEST_ROOM_ERROR",
                "TEST_ROOM_ERROR_DELETE",
                "MOCK_ROOM_ID",
            ],
        },
    });
    // Clean rooms linked to test hotels
    await Room.deleteMany({
        HotelId: {
            $in: [
                "TEST_HOTEL_001",
                "TEST_HOTEL_002",
                "MOCK_HOTEL_ID",
            ],
        },
    });

    await Booking.deleteMany({
        bookingId: {
            $in: [
                "TEST_BOOKING_001",
                "TEST_BOOKING_002",
                "MOCK_BOOKING_ID",
            ],
        },
    });
};

describe('Hotel search', () => {
    beforeEach(async () => {
        await seedData();
        await new Promise(resolve => setTimeout(resolve, 50));
    });

    afterEach(async () => {
        await cleanData();
        jest.restoreAllMocks();
    });

    // Test Case 1.1: Missing Country Parameter
    // Hotel Search - Missing Country
    it('Test Case 1.1: should return 400 when country parameter is missing', async () => {
        const response = await request(app).get('/api/v1/hotel/search').query({
            city: 'Tokyo',
            country: '',
            adults: '2',
            children: '1',
            rooms: '1',
            roomTags: '',
        });

        expect(response.body).toEqual({
            message: 'Country is required.',
            data: null,
        });
        expect(response.status).toBe(400);
    });

    // Test Case 1.2: No Hotels Found
    // Hotel Search - No Hotels Found
    it('Test Case 1.2: should return 404 when no hotels are found', async () => {
        const response = await request(app).get('/api/v1/hotel/search').query({
            city: 'NonExistentCity',
            country: 'NonExistentCountry',
            adults: '2',
            children: '0',
            rooms: '1',
            roomTags: '',
        });

        expect(response.body).toEqual({
            message: 'No hotels found with available rooms for the specified requirement.',
            data: null,
        });
        expect(response.status).toBe(404);

    });

    // Test Case 1.3: Successful Hotel Search
    // Hotel Search - Successful Search
    it('Test Case 1.3: should return 200 with hotels when search is successful', async () => {
        const response = await request(app).get('/api/v1/hotel/search').query({
            city: 'Paris',
            country: 'France',
            adults: '2',
            children: '1',
            rooms: '1',
            roomTags: 'WiFi',
        });

        console.log('Test Case 1.3: Successful Hotel Search')
        console.log(response.body)

        expect(response.body).toMatchObject({
            message: 'Hotels found.',
            data: expect.any(Array),
        });
        expect(response.status).toBe(200);

    });

    // Test Case 1.4: No Rooms Match Requested Services
    // Hotel Search - No Rooms Match Services
    it('Test Case 1.4: should return 404 when no rooms match requested services', async () => {
        const response = await request(app).get('/api/v1/hotel/search').query({
            city: 'Paris',
            country: 'France',
            adults: '2',
            children: '1',
            rooms: '1',
            roomTags: 'Spanish',
        });

        expect(response.body).toEqual({
            message: 'No hotels found with available rooms for the specified services.',
            data: null,
        });
        expect(response.status).toBe(404);

    });

    // Test Case 1.5: Not Enough Rooms for Guests
    // Hotel Search - Not Enough Rooms
    it('Test Case 1.5: should return 404 when not enough rooms are available', async () => {
        const response = await request(app).get('/api/v1/hotel/search').query({
            city: 'Paris',
            country: 'France',
            adults: '10',
            children: '5',
            rooms: '1000',
            roomTags: '',
        });

        expect(response.body).toEqual({
            message: 'No hotels found with enough rooms for the number of guests.',
            data: null,
        });
        expect(response.status).toBe(404);

    });

    // Test Case 1.6: Error During Search
    // Hotel Search - Error Handling
    it('Test Case 1.6: should return 500 when an error occurs', async () => {
        jest.spyOn(Hotel, 'find').mockImplementation(() => {
            throw new Error('Mock error');
        });

        const response = await request(app).get('/api/v1/hotel/search').query({
            city: 'Error City',
            country: 'ErrorCountry',
            adults: 'invalid',
            children: 'invalid',
            rooms: 'invalid',
            roomTags: '',
        });
        console.log('Test Case 1.6: Error During Search')
        console.log(response.body)
        expect(response.body).toEqual({
            message: 'An error occurred while searching for hotels.',
            data: null,
        });
        expect(response.status).toBe(500);

        jest.restoreAllMocks();
    });

    // Test Case 1.7: Room Tags Match
    // Hotel Search - Room Tags Match
    it('Test Case 1.7: should return 200 when room tags match', async () => {

        const response = await request(app).get('/api/v1/hotel/search').query({
            city: 'Paris',
            country: 'France',
            adults: '2',
            children: '1',
            rooms: '1',
            roomTags: 'WiFi',
        });

        console.log('Test Case 1.3: Successful Hotel Search')
        console.log(response.body)

        expect(response.body).toMatchObject({
            message: 'Hotels found.',
            data: expect.any(Array),
        });
        expect(response.status).toBe(200);

    });
});

describe('Get Hotel By ID API', () => {

    beforeEach(async () => {
        await seedData();
        await new Promise(resolve => setTimeout(resolve, 50));
    });

    afterEach(async () => {
        await cleanData();
        jest.restoreAllMocks();
    });

    // Test Case 2.1: Hotel Not Found
    // Hotel Not Found
    it('Test Case 2.1: should return 404 when hotel does not exist', async () => {
        const response = await request(app).get('/api/v1/hotel/NON_EXISTENT_ID');

        expect(response.body).toEqual({
            message: 'Hotel not found.',
            data: null,
        });
        expect(response.status).toBe(404);

    });

    // Test Case 2.2: Hotel Exists, Details Retrieved
    // Hotel Exists, Details Retrieved
    it('Test Case 2.2: should return 200 with hotel details', async () => {
        const response = await request(app).get('/api/v1/hotel/TEST_HOTEL_001').query({
            adults: '2',
            children: '1',
            rooms: '1',
        });

        console.log('Test Case 2.2: Hotel Exists, Details Retrieved')
        console.log(response.body)

        expect(response.body).toMatchObject({
            message: 'Hotel found.',
            data: expect.objectContaining({
                Rooms: expect.any(Array),
                Images: expect.any(Array),
                RoomTags: expect.any(Array),
            }),
        });
        expect(response.status).toBe(200);

    });

    // Test Case 2.3: Hotel Exists, No Rooms Available
    // Hotel Exists, No Rooms Available
    it('Test Case 2.3: should return 200 with empty rooms', async () => {
        await Hotel.create({
            HotelId: "MOCK_HOTEL_ID",
            HotelName: "Mock Hotel",
            Description: "Mock description",
            Category: "Mock category",
            images: {
                caption: "Mock Image",
                imgSource: "http://example.com/mock.jpg",
            },
            Tags: ["WiFi"],
            ParkingIncluded: false,
            LastRenovationDate: new Date(),
            Rating: 3.0,
            Address: {
                StreetAddress: "Mock street",
                City: "Mock city",
                StateProvince: "Mock state",
                PostalCode: "12345",
                Country: "Mock country",
            },
            Location: {
                type: "Point",
                coordinates: [0, 0],
            },
        });

        const response = await request(app).get('/api/v1/hotel/MOCK_HOTEL_ID').query({
            adults: '5',
            children: '2',
            rooms: '1',
        });

        expect(response.body).toMatchObject({
            message: 'Hotel found.',
            data: expect.objectContaining({
                Rooms: [],
            }),
        });
        expect(response.status).toBe(200);

    });

    // Test Case 2.4: Error During Retrieval
    // Error During Retrieval
    it('Test Case 2.4: should return 500 when an error occurs due to invalid data', async () => {

        jest.spyOn(Hotel, 'findOne').mockImplementation(() => {
            throw new Error('Mock error');
        });

        const response = await request(app).get('/api/v1/hotel/TEST_HOTEL_001').query({
            adults: 'invalid',
            children: 'invalid',
            rooms: 'invalid',
        });

        expect(response.body).toEqual({
            message: 'An error occurred while searching for hotels.',
            data: null,
        });
        expect(response.status).toBe(500);

    });
});

describe('Get Hotel Statistics API', () => {

    beforeEach(async () => {
        await seedData();
        await new Promise(resolve => setTimeout(resolve, 50));
    });

    afterEach(async () => {
        await cleanData();
        jest.restoreAllMocks();
    });

    // Test Case 3.1: Hotel Not Found
    // Get Hotel Statistics - Hotel Not Found
    it('Test Case 3.1: should return 404 when hotel does not exist', async () => {
        const response = await request(app).get('/api/v1/hotel/UNKNOWN_ID/statistics');

        expect(response.body).toEqual({
            message: 'Hotel not found.',
        });
        expect(response.status).toBe(404);

    });

    // Test Case 3.2: No Statistics Available
    // Get Hotel Statistics - No Statistics
    it('Test Case 3.2: should return 200 with no statistics message', async () => {
        const response = await request(app).get('/api/v1/hotel/TEST_HOTEL_002/statistics');

        console.log(response.body);
        expect(response.body).toMatchObject({
            message: 'No hotel\'s statistic information found.',
        });
        expect(response.body.data).toHaveProperty('totalRooms', 0);
        expect(response.body.data).toHaveProperty('totalReviews', 0);
        expect(response.body.data).toHaveProperty('totalBookings', 0);
        expect(response.status).toBe(200);

    });

    // Test Case 3.3: Full Statistics Available
    // Get Hotel Statistics - Full Statistics
    it('Test Case 3.3: should return 200 with full statistics', async () => {
        console.log('Test Case 3.3: Full Statistics');
        const response = await request(app).get('/api/v1/hotel/TEST_HOTEL_001/statistics');

        console.log(response.body);
        expect(response.body).toMatchObject({
            message: 'Hotel statistics found.',
        });
        expect(response.body.data).toHaveProperty('totalRooms');
        expect(response.body.data).toHaveProperty('totalReviews');
        expect(response.body.data).toHaveProperty('totalBookings');
        expect(response.status).toBe(200);

    });

    // Test Case 3.4: All Rooms Booked
    // Get Hotel Statistics - All Rooms Booked
    it('Test Case 3.4: should return 200 with zero available rooms', async () => {
        await Room.updateMany({ HotelId: 'TEST_HOTEL_001' }, { NumberAvailable: 0 });

        console.log('Test Case 3.4: All Rooms Booked');
        const response = await request(app).get('/api/v1/hotel/TEST_HOTEL_001/statistics');

        console.log(response.body);
        expect(response.body).toMatchObject({
            message: 'Hotel statistics found.',
        });
        expect(response.body.data).toHaveProperty('totalAvailableRooms', 0);
        expect(response.status).toBe(200);

    });

    // Test Case 3.5: Rooms Lack MaxQuantity
    // Get Hotel Statistics - Rooms Lack MaxQuantity
    it('Test Case 3.5: should return 500 when rooms lack MaxQuantity', async () => {
        console.log('Test Case 3.5: Rooms Lack MaxQuantity');
        await Room.updateMany({ HotelId: 'TEST_HOTEL_001' }, { MaxQuantity: null });

        const response = await request(app).get('/api/v1/hotel/TEST_HOTEL_001/statistics');

        console.log(response.body);
        expect(response.body).toMatchObject({
            message: 'Hotel statistics found.',
        });
        expect(response.body.data).toHaveProperty('totalRooms', 0);
        expect(response.status).toBe(200);

    });

    // Test Case 3.6: Invalid Booking Dates
    // Get Hotel Statistics - Invalid Booking Dates
    it('Test Case 3.6: should return 200 with NaN for average stay duration', async () => {
        console.log('Test Case 3.6: Invalid Booking Dates');
        await Booking.updateMany({ hotelId: 'TEST_HOTEL_001' }, { checkOutDate: null });

        const response = await request(app).get('/api/v1/hotel/TEST_HOTEL_001/statistics');

        console.log(response.body);
        expect(response.body).toMatchObject({
            message: 'Hotel statistics found.',
        });
        expect(response.body.data).toHaveProperty('averageStayDuration', "");
        expect(response.status).toBe(200);

    });

    // Test Case 3.7: No Shuttle Service Used
    // Get Hotel Statistics - No Shuttle Service
    it('Test Case 3.7: should return 200 with zero shuttle usage', async () => {
        console.log('Test Case 3.7: No Shuttle Service');
        const response = await request(app).get('/api/v1/hotel/TEST_HOTEL_001/statistics');

        console.log(response.body);
        expect(response.body).toMatchObject({
            message: 'Hotel statistics found.',
        });
        expect(response.body.data).toHaveProperty('shuttleServiceUsage');
        expect(response.body.data.shuttleServiceUsage).toEqual({
            airportShuttle: 0,
            rentalCar: 0,
            taxiShuttle: 0,
        });
        expect(response.status).toBe(200);

    });

    // Test Case 3.8: All Bookings from Same Country
    // Get Hotel Statistics - All Bookings from Same Country
    it('Test Case 3.8: should return 200 with single country statistics', async () => {
        console.log('Test Case 3.8: All Bookings from Same Country');
        await Booking.deleteMany({ hotelId: 'TEST_HOTEL_001' });
        await Booking.create({
            bookingId: 'TEST_BOOKING_002',
            hotelId: 'TEST_HOTEL_001',
            userId: 'TEST_USER_002',
            customerName: 'Test User',
            customerEmail: 'test.user@example.com',
            customerPhone: '+1234567890',
            customerCountry: 'France',
            airportShuttle: false,
            rentalCar: false,
            rentalCarPrice: 0,
            taxiShuttlePrice: 0,
            taxiShuttle: false,
            specialRequest: 'None',
            bookingDate: new Date(),
            checkInDate: new Date(),
            checkOutDate: new Date(new Date().getTime() + 24 * 60 * 60 * 1000),
            totalAmount: 200,
            arrivalTime: '15:00',
            rooms: [{ roomId: 'TEST_ROOM_001', quantity: 1 }],
            status: 'Confirmed',
            numberOfAdults: 2,
            numberOfChildren: 0,
        });

        const response = await request(app).get('/api/v1/hotel/TEST_HOTEL_001/statistics');

        console.log(response.body);
        expect(response.body).toMatchObject({
            message: 'Hotel statistics found.',
        });
        expect(response.body.data).toHaveProperty('customerCountByCountry');
        expect(response.body.data.customerCountByCountry).toEqual(expect.objectContaining({
            France: expect.any(Number),
        }));
        expect(response.status).toBe(200);

    });

    // Test Case 3.9: Error During Statistics Retrieval
    // Get Hotel Statistics - Error Handling
    it('Test Case 3.9: should return 500 when an error occurs due to invalid data', async () => {
        jest.spyOn(Hotel, 'findOne').mockImplementation(() => {
            throw new Error('Mock error');
        });

        const response = await request(app).get('/api/v1/hotel/INVALID_STAT/statistics');

        expect(response.body).toEqual({
            message: 'An error occurred while getting hotel statistics.',
        });
        expect(response.status).toBe(500);

        jest.restoreAllMocks();
    });
});

describe('Update Hotel Info API', () => {

    beforeEach(async () => {
        await seedData();
        await new Promise(resolve => setTimeout(resolve, 50));
    });

    afterEach(async () => {
        await cleanData();
        jest.restoreAllMocks();
    });


    // Test Case 4.1: Update Hotel Info Successfully with Full Data
    // Test Case 1: Successful update with full data
    it('should return 200 when hotel info is updated successfully with full data', async () => {
        const response = await request(app)
          .post('/api/v1/hotel/updateInfo')
          .query({ hotelID: 'TEST_HOTEL_001' })
          .send({
            hotelData: JSON.stringify({
              HotelName: 'Updated Test Paris Hotel',
              Description: 'Updated test luxury stay',
              Category: '5-Star',
              Tags: ['WiFi', 'Pool'],
              ParkingIncluded: true,
              LastRenovationDate: '2023-02-01',
              Rating: 4.5,
              Address: {
                StreetAddress: '124 Test Rue de Rivoli',
                City: 'Paris',
                StateProvince: 'Île-de-France',
                PostalCode: '75001',
                Country: 'France',
              },
            }),
            image: 'updated_image.jpg',
          });
    
        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          message: 'Hotel information updated successfully.',
          data: expect.any(Object),
        });
    
        // Verify database update
        const updatedHotel = await Hotel.findOne({ HotelId: 'TEST_HOTEL_001' });
        expect(updatedHotel).toMatchObject({
          HotelName: 'Updated Test Paris Hotel',
          Description: 'Updated test luxury stay',
          images: { imgSource: 'updated_image.jpg' },
        });
    });

    // Test Case 4.2: Update Hotel Info Successfully without Image
    it('should return 200 when hotel info is updated without image', async () => {
        const response = await request(app)
          .post('/api/v1/hotel/updateInfo')
          .query({ hotelID: 'TEST_HOTEL_001' })
          .send({
            hotelData: JSON.stringify({
              HotelName: 'Updated Test Paris Hotel No Image',
              Description: 'Updated test stay',
              Category: '5-Star',
              Tags: ['WiFi'],
              ParkingIncluded: false,
              LastRenovationDate: '2023-03-01',
              Rating: 4.0,
              Address: {
                StreetAddress: '125 Test Rue de Rivoli',
                City: 'Paris',
                StateProvince: 'Île-de-France',
                PostalCode: '75001',
                Country: 'France',
              },
            }),
          });
    
        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          message: 'Hotel information updated successfully.',
          data: expect.any(Object),
        });
    
        // Verify database update
        const updatedHotel = await Hotel.findOne({ HotelId: 'TEST_HOTEL_001' });
        expect(updatedHotel).toMatchObject({
          HotelName: 'Updated Test Paris Hotel No Image',
          Description: 'Updated test stay',
          images: { imgSource: 'http://example.com/test_hotel.jpg' },
        });
    });
    

    // Test Case 4.3: Hotel Not Found
    it('Test Case 4.3: should return 404 when hotel does not exist', async () => {
        const response = await request(app)
            .post('/api/v1/hotel/updateInfo')
            .query({ hotelId: 'NON_EXISTENT_ID' })
            .send({
                hotelData: JSON.stringify({
                    HotelName: 'Test Hotel',
                    Description: 'Test description',
                    Address: {
                        StreetAddress: 'Test St',
                        City: 'Test City',
                        StateProvince: 'Test State',
                        PostalCode: '12345',
                        Country: 'Test Country',
                    },
                }),
            });

        expect(response.status).toBe(404);
        expect(response.body).toEqual({
            message: 'Hotel not found.',
            data: null,
        });
    });

    // Test Case 4.4: Invalid Hotel Data
    it('Test Case 4.4: should return 400 when hotelData is invalid JSON', async () => {

        const hotel = await Hotel.findOne({ HotelName: 'Test Paris Luxury Hotel' });
        const response = await request(app)
            .post('/api/v1/hotel/updateInfo')
            .query({ hotelId: hotel.HotelId })
            .send({
                hotelData: 'broken_json',
            });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            message: 'There was an error parsing the hotel data.',
            data: null,
        });
    });

    // Test Case 4.5: Missing Hotel ID
    it('Test Case 4.5: should return 400 when hotelId is missing', async () => {
        const response = await request(app)
            .post('/api/v1/hotel/updateInfo')
            .send({
                hotelData: JSON.stringify({
                    HotelName: 'No ID Hotel',
                    Description: 'Test description',
                    Address: {
                        StreetAddress: 'Test St',
                        City: 'Test City',
                        StateProvince: 'Test State',
                        PostalCode: '12345',
                        Country: 'Test Country',
                    },
                }),
            });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            message: 'Hotel ID is required.',
            data: null,
        });
    });

    // Test Case 4.6: Error During Update
    it('Test Case 4.6: should return 500 when an error occurs during update', async () => {
        jest.spyOn(Hotel.prototype, 'save').mockImplementationOnce(() => {
            throw new Error('Mock error');
        });

        const hotel = await Hotel.findOne({ HotelName: 'Test Paris Luxury Hotel' });

        const response = await request(app)
            .post('/api/v1/hotel/updateInfo')
            .query({ hotelId: hotel.HotelId })
            .send({
                hotelData: JSON.stringify({
                    HotelName: 'Error Hotel',
                    Description: 'Error description',
                    Address: {
                        StreetAddress: 'Error St',
                        City: 'Error City',
                        StateProvince: 'Error State',
                        PostalCode: '12345',
                        Country: 'Error Country',
                    },
                }),
            });

        expect(response.status).toBe(500);
        expect(response.body).toEqual({
            message: 'An error occurred while updating hotel information.',
            data: null,
        });
    });
});

describe('Create Hotel API', () => {

    beforeEach(async () => {
        await seedData();
        await new Promise(resolve => setTimeout(resolve, 50));
    });

    afterEach(async () => {
        await cleanData();
        jest.restoreAllMocks();
    });

    // Test Case 5.1: Create Hotel Successfully
    // Create Hotel - Success
    it('Test Case 5.1: should create a hotel successfully', async () => {
        const response = await request(app).post('/api/v1/hotel/create').send({
            propertyType: 'Luxury',
            propertyDetails: JSON.stringify({
                HotelName: 'Test New Luxury Hotel',
                Description: 'Test new luxury stay',
                Tags: 'WiFi,Pool',
                ParkingIncluded: true,
                LastRenovationDate: '2023-04-01',
                Address: {
                    StreetAddress: '789 Test New St',
                    City: 'Rome',
                    StateProvince: 'Lazio',
                    PostalCode: '00186',
                    Country: 'Italy',
                },
            }),
            rooms: JSON.stringify([
                {
                    RoomType: 'Suite',
                    Description: 'Test luxury suite',
                    BaseRate: 300,
                    Discount: 15,
                    BedOptions: 'King',
                    MaxOccupancy: 3,
                    RoomTags: ['WiFi', 'Pool'],
                    MaxQuantity: 8,
                    Images: { description: 'Test Suite Image', url: 'http://example.com/test_suite.jpg' },
                },
            ]),
            image: 'test_new_hotel.jpg',
        });

        expect(response.body).toMatchObject({
            message: 'Hotel created successfully.',
            data: expect.any(Object),
        });

        // Kiểm tra DB để đảm bảo dữ liệu đã được lưu
        const hotelInDb = await Hotel.findOne({ HotelName: 'Test New Luxury Hotel' });
        expect(response.status).toBe(200);
        expect(hotelInDb).not.toBeNull();
        expect(hotelInDb).toMatchObject({
            HotelName: 'Test New Luxury Hotel',
            Description: 'Test new luxury stay',
            Category: 'Luxury',
        });

        const roomsInDb = await Room.find({ HotelId: hotelInDb.HotelId });
        expect(roomsInDb.length).toBe(1);
    });

    // Test Case 5.2: Create Hotel with Single Tag
    // Create Hotel - Single Tag
    it('Test Case 5.2: should return 200 when hotel is created with single tag', async () => {
        const response = await request(app).post('/api/v1/hotel/create').send({
            propertyType: 'Budget',
            propertyDetails: JSON.stringify({
                HotelName: 'Test Budget Inn',
                Description: 'Test affordable stay',
                Tags: 'WiFi',
                ParkingIncluded: false,
                LastRenovationDate: '2022-05-01',
                Address: {
                    StreetAddress: '101 Test Budget Rd',
                    City: 'Berlin',
                    StateProvince: 'Berlin',
                    PostalCode: '10115',
                    Country: 'Germany',
                },
            }),
            rooms: JSON.stringify([
                {
                    RoomType: 'Standard',
                    Description: 'Test basic room',
                    BaseRate: 80,
                    Discount: 0,
                    BedOptions: 'Twin',
                    MaxOccupancy: 2,
                    RoomTags: [],
                    MaxQuantity: 5,
                    Images: { description: 'Test Standard Room', url: 'http://example.com/test_standard.jpg' },
                },
            ]),
            image: 'test_budget_inn.jpg',
        });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            message: 'Hotel created successfully.',
            data: expect.any(Object),
        });

        // Kiểm tra DB để đảm bảo dữ liệu đã được lưu
        const hotelInDb = await Hotel.findOne({ HotelName: 'Test Budget Inn' });
        expect(hotelInDb).not.toBeNull();
        expect(hotelInDb).toMatchObject({
            HotelName: 'Test Budget Inn',
            Description: 'Test affordable stay',
            Category: 'Budget',
        });
        const roomsInDb = await Room.find({ HotelId: hotelInDb.HotelId });
        expect(roomsInDb.length).toBe(1);
    });

    // Test Case 5.3: Create Hotel with No propertyType
    // Create Hotel - No propertyType
    it('Test Case 5.3: should return 400 when propertyType is missing', async () => {
        const response = await request(app).post('/api/v1/hotel/create').send({
            propertyDetails: JSON.stringify({
                HotelName: 'Test No Type Hotel',
                Description: 'Test missing type',
                Tags: 'WiFi',
                ParkingIncluded: false,
                LastRenovationDate: '2022-06-01',
                Address: {
                    StreetAddress: '202 Test No Type St',
                    City: 'Madrid',
                    StateProvince: 'Madrid',
                    PostalCode: '28001',
                    Country: 'Spain',
                },
            }),
            rooms: '[]',
            image: 'test_no_type.jpg',
        });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            message: 'Property type is required.',
        });

        // Kiểm tra DB để đảm bảo dữ liệu không được lưu
        const hotelInDb = await Hotel.findOne({ HotelName: 'Test No Type Hotel' });
        expect(hotelInDb).toBeNull();
        const roomsInDb = await Room.find({ HotelId: 'TEST_NO_TYPE_HOTEL' });
        expect(roomsInDb.length).toBe(0);
    });

    // Test Case 5.4: Create Hotel with Invalid JSON
    // Create Hotel - Invalid JSON
    it('Test Case 5.4: should return 400 when propertyDetails is invalid JSON', async () => {
        const response = await request(app).post('/api/v1/hotel/create').send({
            propertyType: 'Resort',
            propertyDetails: 'invalid_json',
            rooms: '[]',
            image: 'test_resort.jpg',
        });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            message: 'An error occurred while creating the hotel.',
        });

        // Kiểm tra DB để đảm bảo dữ liệu không được lưu
        const hotelInDb = await Hotel.findOne({ HotelName: 'Test Resort' });
        expect(hotelInDb).toBeNull();
        const roomsInDb = await Room.find({ HotelId: 'TEST_RESORT' });
        expect(roomsInDb.length).toBe(0);
    });

    // Test Case 5.5: Create Hotel with Missing Hotel Name
    // Create Hotel - Missing Hotel Name
    it('Test Case 5.5: should return 400 when hotelName is missing', async () => {
        const response = await request(app).post('/api/v1/hotel/create').send({
            propertyType: 'Boutique',
            propertyDetails: JSON.stringify({
                Description: 'Test no name hotel',
                Tags: 'Pool',
                ParkingIncluded: true,
                LastRenovationDate: '2023-07-01',
                Address: {
                    StreetAddress: '303 Test No Name St',
                    City: 'Amsterdam',
                    StateProvince: 'North Holland',
                    PostalCode: '1012',
                    Country: 'Netherlands',
                },
            }),
            rooms: '[]',
            image: 'test_no_name.jpg',
        });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            message: 'Hotel name is required.',
        });

        // Kiểm tra DB để đảm bảo dữ liệu không được lưu
        const hotelInDb = await Hotel.findOne({ HotelName: null });
        expect(hotelInDb).toBeNull();
        const roomsInDb = await Room.find({ HotelId: 'TEST_NO_NAME_HOTEL' });
        expect(roomsInDb.length).toBe(0);
    });

    // Test Case 5.6: Create Hotel with Missing MaxQuantity
    // Create Hotel - Missing MaxQuantity
    it('Test Case 5.6: should return 400 when room lacks MaxQuantity', async () => {
        const response = await request(app).post('/api/v1/hotel/create').send({
            propertyType: 'City Hotel',
            propertyDetails: JSON.stringify({
                HotelName: 'Test Downtown Stay',
                Description: 'Test urban retreat',
                Tags: 'WiFi',
                ParkingIncluded: false,
                LastRenovationDate: '2022-08-01',
                Address: {
                    StreetAddress: '404 Test City Rd',
                    City: 'Seattle',
                    StateProvince: 'Washington',
                    PostalCode: '98101',
                    Country: 'USA',
                },
            }),
            rooms: JSON.stringify([
                {
                    RoomType: 'Deluxe',
                    Description: 'Test spacious room',
                    BaseRate: 150,
                    Discount: 5,
                    BedOptions: 'Queen',
                    MaxOccupancy: 2,
                    RoomTags: [],
                },
            ]),
            image: 'test_downtown.jpg',
        });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            message: 'MaxQuantity is required.',
        });

        // Kiểm tra DB để đảm bảo dữ liệu không được lưu
        const hotelInDb = await Hotel.findOne({ HotelName: 'Test Downtown Stay' });
        expect(hotelInDb).toBeNull();
        const roomsInDb = await Room.find({ HotelId: 'TEST_DOWNTOWN_STAY' });
        expect(roomsInDb.length).toBe(0);
    });

    // Test Case 5.7: Create Hotel with Default Coordinates
    // Create Hotel - Default Coordinates
    it('Test Case 5.7: should return 200 with default coordinates', async () => {
        const response = await request(app).post('/api/v1/hotel/create').send({
            propertyType: 'Motel',
            propertyDetails: JSON.stringify({
                HotelName: 'Test Roadside Inn',
                Description: 'Test simple stay',
                Tags: 'WiFi',
                ParkingIncluded: true,
                LastRenovationDate: '2020-09-01',
                Address: {
                    StreetAddress: '505 Test Hwy',
                    City: 'Phoenix',
                    StateProvince: 'Arizona',
                    PostalCode: '85001',
                    Country: 'USA',
                },
            }),
            rooms: '[]',
            image: 'test_roadside.jpg',
        });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            message: 'Hotel created successfully.',
        });
        expect(response.body.data).toHaveProperty('Location');
        expect(response.body.data.Location.coordinates).toEqual([0, 0]);

        // Kiểm tra DB để đảm bảo dữ liệu đã được lưu
        const hotelInDb = await Hotel.findOne({ HotelName: 'Test Roadside Inn' });
        expect(hotelInDb).not.toBeNull();
        expect(hotelInDb).toMatchObject({
            HotelName: 'Test Roadside Inn',
            Description: 'Test simple stay',
            Category: 'Motel',
        });
        expect(hotelInDb.Location.coordinates).toEqual([0, 0]);
        const roomsInDb = await Room.find({ HotelId: hotelInDb.HotelId });
        expect(roomsInDb.length).toBe(0);
    });

    // Test Case 5.8: Create Hotel with Invalid Data
    // Create Hotel - Invalid Data
    it('Test Case 5.8: should return 500 when an error occurs due to invalid data', async () => {
        const response = await request(app).post('/api/v1/hotel/create').send({
            propertyType: 'Luxury',
            propertyDetails: JSON.stringify({
                HotelName: null,
                Description: 'Test',
                Tags: 'WiFi',
                ParkingIncluded: true,
                LastRenovationDate: '2023-02-01',
                Address: {
                    StreetAddress: '606 Test St',
                    City: 'Boston',
                    StateProvince: 'Massachusetts',
                    PostalCode: '02108',
                    Country: 'USA',
                },
            }),
            rooms: '[]',
            image: 'test_error.jpg',
        });

        expect(response.status).toBe(500);
        expect(response.body).toEqual({
            message: 'An error occurred while creating the hotel.',
        });

        // Kiểm tra DB để đảm bảo dữ liệu không được lưu
        const hotelInDb = await Hotel.findOne({ HotelName: null });
        expect(hotelInDb).toBeNull();
        const roomsInDb = await Room.find({ HotelId: 'TEST_ERROR_HOTEL' });
        expect(roomsInDb.length).toBe(0);
    });
});

describe('Delete Hotel API', () => {

    beforeEach(async () => {
        await seedData();
        await new Promise(resolve => setTimeout(resolve, 50));
    });

    afterEach(async () => {
        await cleanData();
        jest.restoreAllMocks();
    });

    // Test Case 6.1: Delete Hotel Successfully
    // Delete Hotel - Successful Deletion
    it('Test Case 6.1: should return 200 when hotel is deleted successfully', async () => {
        const response = await request(app).delete('/api/v1/hotel/TEST_HOTEL_001/delete');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            message: 'Hotel deleted successfully.',
        });
    });

    // Test Case 6.2: Hotel Does Not Exist
    // Delete Hotel - Hotel Not Found
    it('Test Case 6.2: should return 404 when hotel does not exist', async () => {
        const response = await request(app).delete('/api/v1/hotel/NON_EXISTENT_HOTEL/delete');
        expect(response.status).toBe(404);
        expect(response.body).toEqual({
            message: 'Hotel not found.',
        });
    });

    // Test Case 6.3: Error During Deletion
    // Delete Hotel - Error Handling
    it('Test Case 6.3: should return 500 when an error occurs due to invalid data', async () => {
        await Hotel.create({
            HotelId: 'TEST_HOTEL_ERROR_DELETE',
            HotelName: "Error Hotel",
            Description: 'Test error hotel',
            Category: '3-Star',
            images: {
                caption: "Error Image",
                imgSource: "http://example.com/error.jpg",
            },
            Tags: [],
            ParkingIncluded: false,
            LastRenovationDate: new Date(),
            Rating: 3.0,
            Address: {
                StreetAddress: 'Error St',
                City: 'Error City',
                StateProvince: 'Error',
                PostalCode: '12345',
                Country: 'ErrorCountry',
            },
            Location: {
                type: 'Point',
                coordinates: [0, 0],
            },
        });

        jest.spyOn(Hotel, 'deleteOne').mockImplementation(() => {
            throw new Error('Mock error');
        });

        const response = await request(app).delete('/api/v1/hotel/TEST_HOTEL_ERROR_DELETE/delete');
        expect(response.status).toBe(500);
        expect(response.body).toEqual({
            message: 'An error occurred while deleting hotel.',
        });
        jest.restoreAllMocks();
    });
});

describe('Get Hotel Rooms API', () => {

    beforeEach(async () => {
        await seedData();
        await new Promise(resolve => setTimeout(resolve, 50));
    });

    afterEach(async () => {
        await cleanData();
        jest.restoreAllMocks();
    });

    // Test Case 7.1: Get Hotel Rooms - Room Found
    // Get Hotel Rooms - Room Found
    it('Test Case 7.1: should return 200 when room is found', async () => {
        const response = await request(app).get('/api/v1/hotel/rooms/TEST_ROOM_001');
        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            message: 'Room found.',
            data: expect.any(Object),
        });
    });

    // Test Case 7.2: Room Not Found
    // Get Hotel Rooms - Room Not Found
    it('Test Case 7.2: should return 404 when room does not exist', async () => {
        const response = await request(app).get('/api/v1/hotel/rooms/INVALID_ROOM_ID');
        expect(response.status).toBe(404);
        expect(response.body).toEqual({
            message: 'Room not found.',
        });
    });

    // Test Case 7.3: Error During Room Retrieval
    // Get Hotel Rooms - Error Handling
    it('Test Case 7.3: should return 500 when an error occurs due to invalid data', async () => {
        await Room.create({
            RoomId: 'TEST_ROOM_ERROR',
            HotelId: 'TEST_HOTEL_001',
            RoomType: "Deluxe",
            Description: 'Test error room',
            BaseRate: 100,
            Discount: 0,
            BedOptions: 'Single',
            MaxOccupancy: 1,
            RoomTags: [],
            NumberAvailable: 0,
            MaxQuantity: 5,
            Images: {
                url: 'http://example.com/error.jpg',
                description: 'Error Room',
            },
        });

        jest.spyOn(Room, 'findOne').mockImplementation(() => {
            throw new Error('Mock error');
        });

        const response = await request(app).get('/api/v1/hotel/rooms/TEST_ROOM_ERROR');
        expect(response.status).toBe(500);
        expect(response.body).toEqual({
            message: 'An error occurred while searching for room.',
        });
        jest.restoreAllMocks();
    });
});

describe('Update Room Info API', () => {

    beforeEach(async () => {
        await seedData();
        await new Promise(resolve => setTimeout(resolve, 50));
    });

    afterEach(async () => {
        await cleanData();
        jest.restoreAllMocks();
    });

    // Test Case 8.1: Update Room Info Successfully
    it('Test Case 8.1: should upload image and update hotel successfully', async () => {

        const oldRoom = await Room.findOne({ RoomId: 'TEST_ROOM_001' });
        const response = await request(app)
          .post('/api/v1/hotel/updateRoom/TEST_ROOM_001')
          .attach('file', 'test/Ảnh màn hình 2025-04-16 lúc 21.30.40.png');
    
        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          message: 'Room updated successfully.',
          data: expect.any(Object),
        });
    
        const updatedRoom = await Room.findOne({ RoomId: 'TEST_ROOM_001' });
        expect(updatedRoom).not.toBeNull();
        expect(updatedRoom.Images.url).not.toEqual(oldRoom.Images.url);
        
    });

    // Test Case 8.2: Room Not Found
    it('Test Case 8.2: should return 404 when room does not exist', async () => {
        const response = await request(app)
            .post('/api/v1/hotel/updateRoom/NON_EXISTENT_HOTEL') 

        expect(response.status).toBe(404);
        expect(response.body).toEqual({
            message: 'Room not found.',
        });
    });


    // Test Case 8.3: Error During Update
    it('Test Case 8.3: should return 500 when an error occurs during update', async () => {

        let oldRoom = await Room.findOne({ RoomId: 'TEST_ROOM_001' });
    

        jest.spyOn(Hotel.prototype, 'save').mockImplementationOnce(() => {
            throw new Error('Mock error');
        });

        const response = await request(app)
            .post('/api/v1/hotel/updateRoom/TEST_HOTEL_001') // Endpoint với hotelId hợp lệ
            .set('Content-Type', 'multipart/form-data')
            .attach('file', Buffer.from('test'), 'test_error.jpg');

        // Kiểm tra phản hồi trả về từ API
        expect(response.status).toBe(500);
        expect(response.body).toEqual({
            message: 'An error occurred while updating room.',
        });
        jest.restoreAllMocks();

        // check if the data is not updated
        const updatedRoom = await Room.findOne({ RoomId: 'TEST_ROOM_001' });
        expect(updatedRoom).toEqual(oldRoom);
        });

});

describe('Delete Room API', () => {

    beforeEach(async () => {
        await seedData();
        await new Promise(resolve => setTimeout(resolve, 50));
    });

    afterEach(async () => {
        await cleanData();
        jest.restoreAllMocks();
    });

    // Test Case 9.1: Delete Room Successfully
    // Delete Room - Successful Deletion
    it('Test Case 9.1: should return 200 when room is deleted successfully', async () => {
        const response = await request(app).delete('/api/v1/hotel/TEST_HOTEL_001/room/TEST_ROOM_001/delete');

        expect(response.body).toEqual({
            message: 'Room deleted successfully.',
        });

        // get room by id to check if the data is deleted
        const deletedRoom = await Room.findOne({ RoomId: 'TEST_ROOM_001' });
        expect(deletedRoom).toBeNull();
        expect(response.status).toBe(200);

    });

    // Test Case 9.2: Room Not Found
    // Delete Room - Room Not Found
    it('Test Case 9.2: should return 404 when room does not exist', async () => {
        const response = await request(app).delete('/api/v1/hotel/TEST_HOTEL_001/room/NON_EXISTENT_ROOM/delete');

        expect(response.body).toEqual({
            message: 'Room not found.',
        });

        // get room by id to check if the data is deleted
        const deletedRoom = await Room.findOne({ RoomId: 'TEST_ROOM_001' });
        expect(deletedRoom).not.toBeNull();
        expect(response.status).toBe(404);

    });

    // Test Case 9.3: Error During Room Deletion
    // Delete Room - Error Handling
    it('Test Case 9.3: should return 500 when an error occurs due to invalid data', async () => {
        await Room.create({
            RoomId: 'TEST_ROOM_ERROR_DELETE',
            HotelId: 'TEST_HOTEL_001',
            RoomType: "Deluxe",
            Description: 'Test error room',
            BaseRate: 100,
            Discount: 0,
            BedOptions: 'Single',
            MaxOccupancy: 1,
            RoomTags: [],
            NumberAvailable: 0,
            MaxQuantity: 5,
            Images: {
                url: 'http://example.com/error.jpg',
                description: 'Error Room',
            },
        });

        jest.spyOn(Room, 'deleteOne').mockImplementation(() => {
            throw new Error('Mock error');
        });

        const response = await request(app).delete('/api/v1/hotel/TEST_HOTEL_001/room/TEST_ROOM_ERROR_DELETE/delete');

        expect(response.body).toEqual({
            message: 'An error occurred while deleting room.',
        });

        // get room by id to check if the data is deleted
        const deletedRoom = await Room.findOne({ RoomId: 'TEST_ROOM_ERROR_DELETE' });
        expect(deletedRoom).not.toBeNull();
        expect(response.status).toBe(500);

        jest.restoreAllMocks();
    });
});
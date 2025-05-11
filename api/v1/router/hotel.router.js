const express = require('express')
const router = express.Router()
const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('file');

const uploadMultiple = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 },
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 10 },
]);

module.exports = uploadMultiple;
module.exports = upload;
const uploadToCloudinary = require('../middlewares/uploadCloud.middlewares.js')
const hotelController = require('../controller/hotel.controller.js')


/**
 * @swagger
 * /hotel/search:
 *   get:
 *     summary: Search for hotels by location
 *     tags:
 *       - Hotel
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *         description: Latitude of the location
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *         description: Longitude of the location
 *       - in: query
 *         name: city
 *         required: false
 *         schema:
 *           type: string
 *         description: City name of the location
 *       - in: query
 *         name: country
 *         required: false
 *         schema:
 *           type: string
 *         description: Country name of the location
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date of the booking
 *       - in: query
 *         name: endDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: End date of the booking
 *       - in: query
 *         name: adults
 *         required: false
 *         schema:
 *           type: number
 *         description: Number of adults
 *       - in: query
 *         name: children
 *         required: false
 *         schema:
 *           type: number
 *         description: Number of children
 *       - in: query
 *         name: rooms
 *         required: false
 *         schema:
 *           type: number
 *         description: Number of rooms
 *     responses:
 *       200:
 *         description: Successfully retrieved hotel search results
 *       400:
 *         description: Invalid request parameters
 */
router.get('/search', hotelController.search)

/**
 * @swagger
 * /hotel/{hotelId}:
 *   get:
 *     summary: Get a hotel by ID
 *     tags:
 *       - Hotel
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         description: Unique identifier for the hotel
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Hotel found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Hotel found.
 *                 data:
 *                   type: object
 *                   description: Hotel details
 *       404:
 *         description: Hotel not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 404
 *                 message:
 *                   type: string
 *                   example: Hotel not found.
 *                 data:
 *                   type: null
 *                   example: null
 *       500:
 *         description: Error occurred while searching for the hotel
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 500
 *                 message:
 *                   type: string
 *                   example: An error occurred while searching for the hotel.
 *                 data:
 *                   type: null
 *                   example: null
 */
router.get('/:hotelId', hotelController.getHotelById)

/**
 * @swagger
 * /hotel/rooms/{roomId}:
 *   get:
 *     summary: Get a room by ID
 *     tags:
 *       - Room
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         description: Unique identifier for the room
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: room found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Room found.
 *                 data:
 *                   type: object
 *                   description: Hotel details
 *       404:
 *         description: room not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 404
 *                 message:
 *                   type: string
 *                   example: room not found.
 *                 data:
 *                   type: null
 *                   example: null
 *       500:
 *         description: Error occurred while searching for the room
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 500
 *                 message:
 *                   type: string
 *                   example: An error occurred while searching for the room.
 *                 data:
 *                   type: null
 *                   example: null
 */
router.get('/rooms/:roomId', hotelController.getHotelRooms)

/**
 * @swagger
 * /review/{hotelId}/{userId}:
 *   post:
 *     summary: Add or update a review for a hotel
 *     description: Add a new review or update an existing review for a hotel using the hotel ID and user ID.
 *     tags:
 *       - Review
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *           example: "hotel_123"
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           example: "user_456"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reviewText:
 *                 type: string
 *                 example: "This hotel was fantastic!"
 *               rating:
 *                 type: integer
 *                 format: int32
 *                 example: 5
 *               bookingId:
 *                 type: string
 *                 example: "booking_789"
 *     responses:
 *       200:
 *         description: Review added or updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Review added successfully."
 *                 review:
 *                   type: object
 *                   properties:
 *                     reviewText:
 *                       type: string
 *                       example: "This hotel was fantastic!"
 *                     rating:
 *                       type: integer
 *                       example: 5
 *                     hotelId:
 *                       type: string
 *                       example: "hotel_123"
 *                     userId:
 *                       type: string
 *                       example: "user_456"
 *                     bookingId:
 *                       type: string
 *                       example: "booking_789"
 *       404:
 *         description: Hotel not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 404
 *                 message:
 *                   type: string
 *                   example: "Hotel not found."
 *       500:
 *         description: An error occurred while processing the review
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 500
 *                 message:
 *                   type: string
 *                   example: "An error occurred while processing the review."
 */
router.post('/:hotelId/review/:userId', hotelController.addReview)

/**
 * @swagger
 * /review/{hotelId}:
 *   get:
 *     summary: Retrieve reviews for a hotel
 *     description: Get all reviews associated with a specific hotel using the hotel ID.
 *     tags:
 *       - Review
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *           example: "hotel_123"
 *     responses:
 *       200:
 *         description: Reviews retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Reviews found."
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       reviewText:
 *                         type: string
 *                         example: "This hotel was fantastic!"
 *                       rating:
 *                         type: integer
 *                         example: 5
 *                       userId:
 *                         type: string
 *                         example: "user_456"
 *                       bookingId:
 *                         type: string
 *                         example: "booking_789"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-10-12T14:30:00Z"
 *       500:
 *         description: An error occurred while retrieving reviews
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 500
 *                 message:
 *                   type: string
 *                   example: "An error occurred while getting reviews."
 */
router.get('/:hotelId/reviews', hotelController.getReviews)

/**
 * @swagger
 * /hotel/statistics/{hotelId}:
 *   get:
 *     summary: Retrieve statistics for a hotel
 *     description: Get various statistics associated with a specific hotel, including total rooms, reviews, ratings, bookings, revenue, occupancy, and customer count by country.
 *     tags:
 *       - Hotel
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *           example: "hotel_123"
 *     responses:
 *       200:
 *         description: Hotel statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Hotel statistics found."
 *                 data:
 *                   type: object
 *                   properties:
 *                     hotel:
 *                       type: object
 *                       properties:
 *                         HotelId:
 *                           type: string
 *                           example: "hotel_123"
 *                         Name:
 *                           type: string
 *                           example: "Grand Hotel"
 *                         Rating:
 *                           type: number
 *                           example: 4.5
 *                     totalRooms:
 *                       type: integer
 *                       example: 100
 *                     totalReviews:
 *                       type: integer
 *                       example: 75
 *                     totalRating:
 *                       type: number
 *                       example: 4.5
 *                     totalBookings:
 *                       type: integer
 *                       example: 120
 *                     totalRevenue:
 *                       type: number
 *                       example: 25000
 *                     totalOccupancy:
 *                       type: integer
 *                       example: 80
 *                     totalAvailableRooms:
 *                       type: integer
 *                       example: 20
 *                     totalRoomsSold:
 *                       type: integer
 *                       example: 80
 *                     totalRoomsSoldPercentage:
 *                       type: number
 *                       example: 80.0
 *                     customerCountByCountry:
 *                       type: object
 *                       additionalProperties:
 *                         type: integer
 *                         example: 5  # Example of customer count per country
 *       500:
 *         description: An error occurred while retrieving hotel statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 500
 *                 message:
 *                   type: string
 *                   example: "An error occurred while getting hotel statistics."
 */
router.get('/:hotelId/statistics', hotelController.getHotelStatistics)

/**
 * @swagger
 * /api/v1/hotel/updateInfo/{hotel}:
 *   post:
 *     summary: Update hotel information
 *     description: Updates the details of a specific hotel using its hotel ID.
 *     tags:
 *       - Hotel
 *     parameters:
 *       - in: query
 *         name: hotelID
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique identifier of the hotel to update.
 *         example: "hotel_12345"
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               hotelData:
 *                 type: string
 *                 description: JSON string containing updated hotel details.
 *                 example: '{"HotelName": "Updated Hotel", "Description": "New description", "Category": "Luxury", "Tags": ["beach", "spa"], "ParkingIncluded": true, "LastRenovationDate": "2023-10-01", "Rating": 4.5, "Address": {"Street": "123 Main St", "City": "Beach City", "Country": "USA"}}'
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: An optional new image file for the hotel.
 *     responses:
 *       200:
 *         description: Hotel information updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Hotel information updated successfully."
 *                 data:
 *                   type: object
 *                   description: The updated hotel details.
 *       404:
 *         description: Hotel not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 404
 *                 message:
 *                   type: string
 *                   example: "Hotel not found."
 *       500:
 *         description: An error occurred while updating hotel information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 500
 *                 message:
 *                   type: string
 *                   example: "An error occurred while updating hotel information."
 */
router.post(`/updateInfo?`, upload, uploadToCloudinary.upload, hotelController.updateHotelInfo)

/**
 * @swagger
 * hotel/updateRoom/{room}:
 *   post:
 *     summary: Update room information
 *     description: Updates room information for a specific room in a hotel.
 *     tags:
 *       - Room
 *     parameters:
 *       - in: path
 *         name: room
 *         required: true
 *         schema:
 *           type: string
 *         description: The room identifier to update.
 *         example: "room_123"
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               hotelData:
 *                 type: string
 *                 description: Data related to the room in JSON format.
 *                 example: '{"roomName": "Deluxe Suite", "price": 200}'
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: An image file associated with the room.
 *     responses:
 *       200:
 *         description: Room information updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Room information updated successfully."
 *                 data:
 *                   type: object
 *                   description: The updated room data.
 *       404:
 *         description: Room or hotel not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 404
 *                 message:
 *                   type: string
 *                   example: "Hotel not found."
 *       500:
 *         description: An error occurred while updating the room information.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 500
 *                 message:
 *                   type: string
 *                   example: "An error occurred while uploading image."
 */
router.post(
  '/updateRoom/:roomId',
  upload,
  uploadToCloudinary.upload,
  hotelController.updateRoomInfo
);
/**
 * @swagger
 * /hotel/create:
 *   post:
 *     summary: Create a new hotel
 *     description: Creates a new hotel with the provided details and stores it in the database.
 *     tags:
 *       - Hotel
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               HotelName:
 *                 type: string
 *                 description: The name of the hotel.
 *                 example: "Sunrise Hotel"
 *               Description:
 *                 type: string
 *                 description: A brief description of the hotel.
 *                 example: "A luxurious beachfront hotel."
 *               Category:
 *                 type: string
 *                 description: The category of the hotel.
 *                 example: "Luxury"
 *               Tags:
 *                 type: string
 *                 description: Comma-separated tags for the hotel.
 *                 example: "beachfront,spa,5-star"
 *               ParkingIncluded:
 *                 type: boolean
 *                 description: Whether the hotel includes parking.
 *                 example: true
 *               LastRenovationDate:
 *                 type: string
 *                 format: date
 *                 description: The date of the hotel's last renovation.
 *                 example: "2022-05-15"
 *               Address:
 *                 type: object
 *                 description: The address of the hotel.
 *                 properties:
 *                   Longitude:
 *                     type: number
 *                     description: Longitude of the hotel location.
 *                     example: 77.5946
 *                   Latitude:
 *                     type: number
 *                     description: Latitude of the hotel location.
 *                     example: 12.9716
 *                 required:
 *                   - Longitude
 *                   - Latitude
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: The image file for the hotel.
 *     responses:
 *       200:
 *         description: Hotel created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Hotel created successfully."
 *                 data:
 *                   type: object
 *                   description: Details of the created hotel.
 *       500:
 *         description: An error occurred while creating the hotel
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 500
 *                 message:
 *                   type: string
 *                   example: "An error occurred while creating the hotel."
 */
router.post('/create', upload, uploadToCloudinary.upload, hotelController.createHotel)

/**
 * @swagger
 * /api/v1/hotel/{hotelId}/room/{roomId}/delete:
 *   delete:
 *     summary: Delete a room
 *     description: Deletes a specific room in a hotel using its room ID and associated hotel ID.
 *     tags:
 *       - Room
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         description: ID of the hotel the room belongs to.
 *         schema:
 *           type: string
 *           example: "hotel_123"
 *       - in: path
 *         name: roomId
 *         required: true
 *         description: ID of the room to delete.
 *         schema:
 *           type: string
 *           example: "room_456"
 *     responses:
 *       200:
 *         description: Room deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Room deleted successfully."
 *       404:
 *         description: Room not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 404
 *                 message:
 *                   type: string
 *                   example: "Room not found."
 *       500:
 *         description: Error deleting room.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 500
 *                 message:
 *                   type: string
 *                   example: "An error occurred while deleting room."
 */
router.delete('/:hotelId/room/:roomId/delete', hotelController.deleteRoom)

/**
 * @swagger
 * /api/v1/hotel/{hotelId}/delete:
 *   delete:
 *     summary: Delete a hotel
 *     description: Deletes a specific hotel and all related data (rooms, reviews, bookings) using its hotel ID.
 *     tags:
 *       - Hotel
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         description: ID of the hotel to delete.
 *         schema:
 *           type: string
 *           example: "hotel_123"
 *     responses:
 *       200:
 *         description: Hotel deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Hotel deleted successfully."
 *       404:
 *         description: Hotel not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 404
 *                 message:
 *                   type: string
 *                   example: "Hotel not found."
 *       500:
 *         description: Error deleting hotel.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 */
router.delete('/:hotelId/delete', hotelController.deleteHotel)

module.exports = router

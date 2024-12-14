const express = require('express')
const router = express.Router()

const bookingController = require('../controller/booking.controller.js')

/**
 * @swagger
 * /booking:
 *   post:
 *     summary: Create a new booking
 *     description: Create a new booking for a hotel with selected rooms and guest details.
 *     tags:
 *       - Booking
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               hotelId:
 *                 type: string
 *                 example: "hotel_123"
 *               userId:
 *                 type: string
 *                 default: "guest"
 *                 example: "user_456"
 *               booking:
 *                 type: object
 *                 properties:
 *                   startDate:
 *                     type: string
 *                     format: date
 *                     example: "2024-11-01"
 *                   endDate:
 *                     type: string
 *                     format: date
 *                     example: "2024-11-10"
 *                   adults:
 *                     type: integer
 *                     example: 2
 *                   children:
 *                     type: integer
 *                     example: 1
 *               selectedRooms:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     roomId:
 *                       type: string
 *                       example: "room_789"
 *                     quantity:
 *                       type: integer
 *                       example: 2
 *     responses:
 *       200:
 *         description: Booking created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Booking created successfully."
 *                 data:
 *                   type: string
 *                   example: "booking_123"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Booking create error"
 */
router.post('/create', bookingController.create)

/**
 * @swagger
 * /booking/{bookingId}:
 *   get:
 *     summary: Get a booking by booking ID
 *     description: Retrieve booking details using the booking ID.
 *     tags:
 *       - Booking
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *           example: "booking_123"
 *     responses:
 *       200:
 *         description: Successfully retrieved booking
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   $ref: '#/components/schemas/Booking'
 *       404:
 *         description: Booking not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Booking not found."
 */
router.get('/:bookingId', bookingController.getBooking)

/**
 * @swagger
 * /booking/{bookingId}/update:
 *   post:
 *     summary: Update a booking by booking ID
 *     description: Update booking details using the booking ID.
 *     tags:
 *       - Booking
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *           example: "booking_123"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 example: "john.doe@example.com"
 *               phoneNo:
 *                 type: string
 *                 example: "1234567890"
 *               country:
 *                 type: string
 *                 example: "US"
 *               notes:
 *                 type: string
 *                 example: "Additional notes"
 *               arrivalTime:
 *                 type: string
 *                 example: "12:00 PM"
 *               finalPrice:
 *                 type: number
 *                 example: 500
 *               airportShuttle:
 *                 type: boolean
 *                 example: true
 *               rentalCar:
 *                 type: boolean
 *                 example: false
 *               taxiShuttle:
 *                 type: boolean
 *                 example: false
 *               specialRequest:
 *                 type: string
 *                 example: "Special requests"
 *     responses:
 *       200:
 *         description: Booking updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Booking updated successfully."
 *                 status:
 *                   type: integer
 *                   example: 200
 *       404:
 *         description: Booking not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Booking not found."
 *                 status:
 *                   type: integer
 *                   example: 404
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error."
 *                 status:
 *                   type: integer
 *                   example: 500
 */
router.post('/:bookingId/update', bookingController.updateBooking)

/**
 * @swagger
 * /booking/bookingHistory/{email}:
 *   get:
 *     summary: Get bookings by email
 *     description: Retrieve all bookings made by a user using the email address.
 *     tags:
 *       - Booking
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           example: "john.doe@example.com"
 *     responses:
 *       200:
 *         description: A list of bookings associated with the email
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       bookingId:
 *                         type: string
 *                         example: "booking_123"
 *                       hotelId:
 *                         type: string
 *                         example: "hotel_456"
 *                       userId:
 *                         type: string
 *                         example: "user_789"
 *                       checkInDate:
 *                         type: string
 *                         format: date
 *                         example: "2023-12-01"
 *                       checkOutDate:
 *                         type: string
 *                         format: date
 *                         example: "2023-12-10"
 *                       status:
 *                         type: string
 *                         example: "confirmed"
 *                       totalAmount:
 *                         type: number
 *                         example: 500
 *                   description: List of bookings
 *       404:
 *         description: No bookings found for the provided email
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "No bookings found."
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error."
 */
router.get('/bookingHistory/:email', bookingController.getBookingsByEmail)

/**
 * @swagger
 * /booking/bookingHistory/manager/{hotelId}:
 *   get:
 *     summary: Get booking history by hotel ID
 *     description: Retrieve all bookings associated with a specific hotel using the hotel ID.
 *     tags:
 *       - Booking
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *           example: "hotel_123"
 *     responses:
 *       200:
 *         description: A list of bookings for the specified hotel
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bookings:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       bookingId:
 *                         type: string
 *                         example: "booking_456"
 *                       userId:
 *                         type: string
 *                         example: "user_789"
 *                       checkInDate:
 *                         type: string
 *                         format: date
 *                         example: "2023-12-01"
 *                       checkOutDate:
 *                         type: string
 *                         format: date
 *                         example: "2023-12-10"
 *                       status:
 *                         type: string
 *                         example: "confirmed"
 *                       totalAmount:
 *                         type: number
 *                         example: 750
 *                 totalPages:
 *                   type: integer
 *                   example: 5
 *       404:
 *         description: No bookings found for the provided hotel ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "No bookings found for the specified hotel."
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error."
 */
router.get('/bookingHistory/manager/:hotelId', bookingController.getBookingsByHotelId)

/**
 * @swagger
 * /booking/{bookingId}:
 *   delete:
 *     summary: Delete a booking
 *     description: Removes a booking from the database using the provided bookingId.
 *     tags:
 *       - Booking
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         description: The unique identifier of the booking to be deleted.
 *         schema:
 *           type: string
 *           example: "booking_123"
 *     responses:
 *       200:
 *         description: Booking deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Booking deleted successfully."
 *       404:
 *         description: Booking not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Booking not found."
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error."
 */
router.delete('/:bookingId', bookingController.deleteBooking)

module.exports = router

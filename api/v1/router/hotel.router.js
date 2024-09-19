const express = require("express");
const router = express.Router();

const hotelController = require("../controller/hotel.controller.js");

/**
 * @swagger
 * /hotel/search:
 *   get:
 *     summary: Search for hotels by location
 *     tags:
 *       - Hotels
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
router.get("/search", hotelController.search);

/**
 * @swagger
 * /hotel/{hotelId}:
 *   get:
 *     summary: Get a hotel by ID
 *     tags:
 *       - Hotels
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
router.get("/:hotelId", hotelController.getHotelById);

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
router.get("/rooms/:roomId", hotelController.getHotelRooms);

module.exports = router;

const express = require("express");
const router = express.Router();

const hotelController = require("../controller/hotel.controller.js");

/**
 * @swagger
 * /hotel/search:
 *   get:
 *     summary: Search hotels by location
 *     tags:
 *       - Hotels
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               lat:
 *                 type: number
 *                 description: Latitude of the location
 *               lng:
 *                 type: number
 *                 description: Longitude of the location
 *               city:
 *                 type: string
 *                 description: City name of the location
 *               country:
 *                 type: string
 *                 description: Country name of the location
 *     responses:
 *       200:
 *         description: Hotels found successfully
 *       400:
 *         description: Bad request
 */
router.get("/search", hotelController.search);

module.exports = router;

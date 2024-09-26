const express = require("express");
const router = express.Router();

const bookingController = require("../controller/booking.controller.js");

router.post("/create", bookingController.create);

router.get("/:bookingId", bookingController.getBooking);

router.post("/:bookingId/update", bookingController.updateBooking);

module.exports = router;

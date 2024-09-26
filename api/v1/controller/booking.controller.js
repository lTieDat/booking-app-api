const Booking = require("../../../models/booking.model.js");
const generate = require("../../../helper/generate");
const Room = require("../../../models/room.model.js");

// [POST] /booking
module.exports.create = async (req, res) => {
  try {
    const { hotelId, userId = "guest", booking, selectedRooms } = req.body;
    // Generate booking ID
    const bookingID = generate.genenrateRandomString(10);

    // Create new booking object
    const newBooking = new Booking({
      bookingId: bookingID,
      hotelId,
      userId,
      checkInDate: booking.startDate,
      checkOutDate: booking.endDate,
      rooms: selectedRooms,
      status: "pending",
      numberOfAdults: booking.adults,
      numberOfChildren: booking.children,
    });

    await newBooking.save();
    if (!newBooking) {
      console.error("Booking creation failed.", error);
    }
    // Get list of room IDs
    const roomIDs = selectedRooms.map((room) => room.roomId);

    // Update room quantities
    const rooms = await Room.find({ RoomId: { $in: roomIDs } });
    await Promise.all(
      rooms.map(async (room) => {
        const selectedRoom = selectedRooms.find(
          (r) => r.roomId === room.RoomId.toString()
        );
        room.NumberAvailable -= selectedRoom.quantity;
        await room.save();
      })
    );

    res.status(200).json({
      message: "Booking created successfully.",
      data: newBooking.bookingId,
    });
  } catch (error) {
    console.error("Booking create error:", error);
  }
};

//[GET] /booking/:bookingId
module.exports.getBooking = async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    const booking = await Booking.findOne({ bookingId });
    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }
    res.status(200).json({ data: booking });
  } catch (error) {
    console.error("Booking get error:", error);
  }
};

//[POST] /booking/:bookingId/update
module.exports.updateBooking = async (req, res) => {
  try {
    const update = req.body;
    const bookingId = req.body.bookingId;

    // Find the existing booking
    let booking = await Booking.findOne({ bookingId });
    if (!booking) {
      return res
        .status(404)
        .json({ message: "Booking not found.", status: 404 });
    }

    // Update booking attributes directly
    booking.customerName = update.fullName;
    booking.customerEmail = update.email;
    booking.customerPhone = update.phoneNo;
    booking.notes = update.notes;
    booking.arrivalTime = update.arrivalTime;
    booking.totalAmount = update.finalPrice;
    booking.airportShuttle = update.airportShuttle;
    booking.rentalCar = update.rentalCar;
    booking.taxiShuttle = update.taxiShuttle;
    booking.specialRequest = update.specialRequest;
    // console.log(booking);

    // Save the updated booking
    await booking.save();
    res
      .status(200)
      .json({ message: "Booking updated successfully.", status: 200 });
  } catch (error) {
    console.error("Booking update error:", error);
    res.status(500).json({ message: "Internal server error.", status: 500 });
  }
};

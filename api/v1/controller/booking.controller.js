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

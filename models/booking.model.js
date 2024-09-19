const mongoose = require("mongoose");

// Schema for room selection (each room type with its quantity)
const roomSelectionSchema = new mongoose.Schema({
  roomId: { type: String, required: true }, // Room ID
  quantity: { type: Number, required: true, min: 1 }, // Number of rooms selected
  _id: false, // Disabling automatic _id field for subdocuments
});

// Schema for payment details
const paymentSchema = new mongoose.Schema({
  cardType: { type: String, required: false },
  cardNumber: { type: String, required: false },
  cardHolder: { type: String, required: false },
  expirationDate: { type: String, required: false }, // Keeping expiration as MM/YY for simplicity
  cvv: { type: String, required: false },
});

// Main booking schema
const bookingSchema = new mongoose.Schema(
  {
    bookingId: { type: String, unique: true, required: true }, // Unique Booking ID
    hotelId: { type: String, required: true }, // Hotel ID
    userId: { type: String, required: true }, // User ID

    bookingDate: { type: Date, default: Date.now, required: true }, // Booking creation date
    checkInDate: { type: Date, required: true }, // Check-in date
    checkOutDate: { type: Date, required: true }, // Check-out date

    rooms: {
      type: [roomSelectionSchema],
      required: true,
      validate: [arrayLimit, "At least one room must be selected"], // Custom validation to ensure at least one room is selected
    },

    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
      required: true,
    }, // Booking status

    numberOfAdults: { type: Number, required: true, min: 1 }, // Number of adults
    numberOfChildren: { type: Number, required: true, min: 0 }, // Number of children

    payment: paymentSchema, // Payment info is not required until confirmation
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt fields
);

// Function to ensure at least one room is selected
function arrayLimit(val) {
  return val.length > 0;
}

// Creating the model
const Booking = mongoose.model("Booking", bookingSchema, "bookings");

module.exports = Booking;

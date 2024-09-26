const mongoose = require("mongoose");

// Schema for room selection (each room type with its quantity)
const roomSelectionSchema = new mongoose.Schema({
  roomId: { type: String, required: true }, // Room ID
  quantity: { type: Number, required: true, min: 1 }, // Number of rooms selected
});

// Main booking schema
const bookingSchema = new mongoose.Schema(
  {
    bookingId: { type: String, unique: true, required: true }, // Unique Booking ID
    hotelId: { type: String, required: true }, // Hotel ID
    userId: { type: String }, // User ID
    customerName: { type: String }, // Customer name
    customerEmail: { type: String }, // Customer email
    customerPhone: { type: String }, // Customer phone number
    airportShuttle: { type: Boolean },
    rentalCar: { type: Boolean },
    taxiShuttle: { type: Boolean },
    specialRequest: { type: String },
    bookingDate: { type: Date, default: Date.now }, // Booking creation date
    checkInDate: { type: Date, required: true }, // Check-in date
    checkOutDate: { type: Date, required: true }, // Check-out date
    totalAmount: { type: Number }, // Total amount
    arrivalTime: { type: String }, // Arrival time
    rooms: {
      type: [roomSelectionSchema],
      required: true,
    },

    status: {
      type: String,
    },

    numberOfAdults: { type: Number, required: true, min: 1 }, // Number of adults
    numberOfChildren: { type: Number, required: true, min: 0 }, // Number of children
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt fields
);

// Creating the model
const Booking = mongoose.model("Booking", bookingSchema, "bookings");

module.exports = Booking;

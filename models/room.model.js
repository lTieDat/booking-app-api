const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    RoomId: { type: String, unique: true },
    HotelId: { type: String, ref: "hotels" },
    RoomType: { type: String, required: true },
    Description: { type: String },
    BaseRate: { type: Number, required: true },
    BedOptions: { type: String },
    MaxOccupancy: { type: Number, required: true },
    RoomTags: [String],
    NumberAvailable: { type: Number, required: true },
    Images: {
      url: String,
      description: String,
    },
  },
  { timestamps: true }
);

const Room = mongoose.model("Room", roomSchema, "rooms");

module.exports = Room;

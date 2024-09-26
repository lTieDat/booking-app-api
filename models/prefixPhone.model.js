const mongoose = require("mongoose");

const prefixSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    dial_code: {
      type: String,
    },
    code: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Prefix = mongoose.model("Prefix", prefixSchema, "prefix");

module.exports = Prefix;

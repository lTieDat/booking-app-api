const mongoose = require("mongoose");
const accountSchema = new mongoose.Schema(
  {
    fullName: String,
    email: String,
    password: String,
    hotel_id: {
      type: Array,
      default: [],
    },
    token: {
      type: String,
    },
    phone: String,
    avatar: String,
    role_id: String,
    status: String,
    deleted: {
      type: Boolean,
      default: false,
    },
    deletedBy: {
      deletedAt: Date,
      account_id: String,
    },
    createdBy: {
      createdAt: {
        type: Date,
        default: Date.now,
      },
      account_id: String,
    },
  },
  {
    timestamps: true,
  }
);

const Account = mongoose.model("Account", accountSchema, "accounts");

module.exports = Account;

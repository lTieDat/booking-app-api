const express = require("express");
const userRouter = require("./user.router");
const hotelRouter = require("./hotel.router");
const bookingRouter = require("./booking.router");

const router = (app) => {
  const version = "/api/v1";
  app.use(`${version}/hotel`, hotelRouter);
  app.use(`${version}/users`, userRouter);
  app.use(`${version}/booking`, bookingRouter);
};

module.exports = router;

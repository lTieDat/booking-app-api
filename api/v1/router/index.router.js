const express = require("express");
const userRouter = require("./user.router");
const hotelRouter = require("./hotel.router");

const router = (app) => {
  const version = "/api/v1";
  app.use(`${version}/hotel`, hotelRouter);
  app.use(`${version}/users`, userRouter);
};

module.exports = router;

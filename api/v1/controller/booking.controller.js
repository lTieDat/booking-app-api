const Booking = require('../../../models/booking.model.js')
const generate = require('../../../helper/generate')
const Room = require('../../../models/room.model.js')
const Review = require('../../../models/review.model.js')
const Hotel = require('../../../models/hotelDetail.model.js')

// [POST] /booking
module.exports.create = async (req, res) => {
  try {
    const { hotelId, userId = 'guest', booking, selectedRooms } = req.body
    // Generate booking ID
    const bookingID = generate.genenrateRandomString(10)

    // Create new booking object
    const newBooking = new Booking({
      bookingId: bookingID,
      hotelId,
      userId,
      checkInDate: booking.startDate,
      checkOutDate: booking.endDate,
      rooms: selectedRooms,
      status: 'pending',
      numberOfAdults: booking.adults,
      numberOfChildren: booking.children,
    })

    await newBooking.save()
    if (!newBooking) {
      console.error('Booking creation failed.', error)
    }
    // Get list of room IDs
    const roomIDs = selectedRooms.map((room) => room.roomId)

    // Update room quantities
    const rooms = await Room.find({ RoomId: { $in: roomIDs } })
    await Promise.all(
      rooms.map(async (room) => {
        const selectedRoom = selectedRooms.find((r) => r.roomId === room.RoomId.toString())
        room.NumberAvailable -= selectedRoom.quantity
        await room.save()
      })
    )

    res.status(200).json({
      message: 'Booking created successfully.',
      data: newBooking.bookingId,
    })
  } catch (error) {
    console.error('Booking create error:', error)
  }
}

//[GET] /booking/:bookingId
module.exports.getBooking = async (req, res) => {
  try {
    const bookingId = req.params.bookingId
    const booking = await Booking.findOne({ bookingId })
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' })
    }
    res.status(200).json({ data: booking })
  } catch (error) {
    console.error('Booking get error:', error)
  }
}

//[POST] /booking/:bookingId/update
module.exports.updateBooking = async (req, res) => {
  try {
    const update = req.body
    const bookingId = req.body.bookingId

    // Find the existing booking
    let booking = await Booking.findOne({ bookingId })
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.', status: 404 })
    }

    // Update booking attributes directly
    booking.customerName = update.fullName
    booking.customerEmail = update.email
    booking.customerPhone = update.phoneNo
    booking.customerCountry = update.country
    booking.notes = update.notes
    booking.arrivalTime = update.arrivalTime
    booking.totalAmount = update.finalPrice
    booking.airportShuttle = update.airportShuttle
    booking.rentalCar = update.rentalCar
    booking.taxiShuttle = update.taxiShuttle
    booking.specialRequest = update.specialRequest
    // console.log(booking);

    // Save the updated booking
    await booking.save()
    res.status(200).json({ message: 'Booking updated successfully.', status: 200 })
  } catch (error) {
    console.error('Booking update error:', error)
    res.status(500).json({ message: 'Internal server error.', status: 500 })
  }
}

//[GET] /booking/:bookingId/
module.exports.getBookingsByEmail = async (req, res) => {
  try {
    const email = req.params.email
    const bookings = await Booking.find({ customerEmail: email })

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ message: 'Booking not found.' })
    }
    const bookingsWithReviews = await Promise.all(
      bookings.map(async (booking) => {
        const review = await Review.findOne({
          hotelId: booking.hotelId,
          userId: booking.userId,
          bookingId: booking.bookingId,
        })
        return {
          ...booking._doc,
          review: review ? review : 'no reviews',
        }
      })
    )

    res.status(200).json({ data: bookingsWithReviews })
  } catch (error) {
    console.error('Booking get error:', error)
    res.status(500).json({ message: 'Internal server error.' })
  }
}

//[GET] /bookingHistory/manager/:hotelId
module.exports.getBookingsByHotelId = async (req, res) => {
  const { hotelId } = req.params
  const { filterStatus, searchQuery, sortBy, page = 1, itemsPerPage = 4, month } = req.query
  try {
    // Fetch bookings by the single hotel ID
    const bookings = await Booking.find({ hotelId })

    // Fetch the hotel details
    const hotel = await Hotel.findOne({ HotelId: hotelId })

    // Add hotel name to bookings
    const bookingsWithHotelName = bookings.map((booking) => {
      return {
        ...booking._doc,
        hotelName: hotel?.HotelName || 'Unknown',
      }
    })

    // Initialize filteredBookings with all bookings, sorting by createdDate in descending order
    let filteredBookings = bookingsWithHotelName.sort((a, b) => {
      return new Date(b.createdDate) - new Date(a.createdDate) // Descending order by createdDate
    })

    // Filter by status if provided
    if (filterStatus) {
      filteredBookings = filteredBookings.filter((booking) => {
        return booking.status === filterStatus
      })
    }

    // // Filter by month if provided
    // if (month) {
    //   const monthInt = parseInt(month); // Convert month string to number
    //   filteredBookings = filteredBookings.filter((booking) => {
    //     const bookingMonth = new Date(booking.checkInDate).getMonth() + 1;
    //     return bookingMonth === monthInt;
    //   });
    // }
    // console.log(filteredBookings);

    // Search by customer name if search query is provided
    if (searchQuery) {
      filteredBookings = filteredBookings.filter((booking) => {
        if (booking.customerName) {
          return booking.customerName.toLowerCase().includes(searchQuery.toLowerCase())
        }
        return false // Exclude bookings with no customer name
      })
    }

    // Sorting logic based on selected criteria
    filteredBookings = filteredBookings.sort((a, b) => {
      switch (sortBy) {
        case 'totalAmountAsc':
          return a.totalAmount - b.totalAmount
        case 'totalAmountDesc':
          return b.totalAmount - a.totalAmount
        case 'numberOfGuest':
          return b.numberOfAdults + b.numberOfChildren - (a.numberOfAdults + a.numberOfChildren)
        default:
          // If no specific sort, return by createdDate in descending order
          return new Date(b.createdDate) - new Date(a.createdDate)
      }
    })
    // Pagination logic
    const startIndex = (page - 1) * itemsPerPage
    const paginatedBookings = filteredBookings.slice(startIndex, startIndex + itemsPerPage)
    const totalPages = Math.ceil(filteredBookings.length / itemsPerPage)

    // Send response with paginated bookings and total page count
    res.status(200).json({ bookings: paginatedBookings, totalPages })
  } catch (error) {
    console.error('Error fetching bookings:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

//[DELETE] /booking/:bookingId
module.exports.deleteBooking = async (req, res) => {
  try {
    const bookingId = req.params.bookingId
    const booking = await Booking.findOne({ bookingId })
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' })
    }
    await booking.remove()
    res.status(200).json({ message: 'Booking deleted successfully.' })
  } catch (error) {
    console.error('Booking delete error:', error)
    res.status(500).json({ message: 'Internal server error.' })
  }
}

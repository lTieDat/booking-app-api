const User = require('../../../models/user.model')
const Prefix = require('../../../models/prefixPhone.model')
const md5 = require('md5')
const { generateRandomString } = require('../../../helper/generate')
const mailHelper = require('../../../helper/sendmail')
const Account = require('../../../models/account.model')
const Hotel = require('../../../models/hotelDetail.model')
const Booking = require('../../../models/booking.model')
const Room = require('../../../models/room.model')
const Post = require('../../../models/post.model')
const Setting = require('../../../models/setting.model')

//[GET] /api/v1/admin/DashboardData/:adminId
module.exports.getDashboardData = async (req, res) => {
  try {
    const token = req.params.adminId
    const manager = await Account.findOne({ token })

    if (!manager) {
      return res.status(404).json({ error: 'Manager not found' })
    }

    const hotelIds = manager.hotel_id
    const rooms = await Room.find({
      HotelId: { $in: hotelIds },
    })

    const hotels = await Hotel.find({
      HotelId: { $in: hotelIds },
    })

    const bookings = await Booking.find({
      hotelId: { $in: hotelIds },
    })

    const pendingBookings = bookings.filter((booking) => booking.status === 'pending')

    const paidBookings = bookings.filter((booking) => booking.status === 'paid')

    const confirmedBookings = bookings.filter((booking) => booking.status === 'confirmed')

    // Calculate total revenue for each hotel
    const totalRevenue = hotels.map((hotel) => {
      const hotelBookings = bookings.filter((booking) => booking.hotelId === hotel.HotelId)
      return {
        hotelId: hotel.HotelName,
        totalRevenue: hotelBookings.reduce((sum, booking) => sum + booking.totalAmount, 0),
      }
    })

    //get free rooms, booked rooms, and total rooms for each hotel
    const hotelRoomData = hotels.map((hotel) => {
      const hotelRooms = rooms.filter((room) => room.HotelId == hotel.HotelId)

      const totalRooms = hotelRooms.reduce((sum, room) => sum + room.MaxQuantity, 0)
      const freeRooms = hotelRooms.reduce((sum, room) => sum + room.NumberAvailable, 0)
      const bookedRooms = totalRooms - freeRooms
      return {
        hotelId: hotel.HotelName,
        totalRooms,
        bookedRooms,
        freeRooms,
      }
    })

    res.json({
      message: 'Dashboard data fetched successfully',
      status: 200,
      data: {
        totalHotels: hotels.length,
        totalBookings: bookings.length,
        pendingBookings: pendingBookings.length,
        paidBookings: paidBookings.length,
        confirmedBookings: confirmedBookings.length,
        totalRevenue,
        hotelRoomData,
      },
    })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    res.status(500).json({ error: 'An error occurred while fetching dashboard data' })
  }
}

//[POST] /admin/login
module.exports.adminLogin = async (req, res) => {
  try { // VuNA - accountController.test - AL1.4
    const { email, password } = req.body
    const account = await Account.findOne({ email })
    if (!account) { // VuNA - accountController.test - AL1.1
      return res.json({ message: 'Email not found', status: 400 })
    }
    console.log(md5(password))
    if (account.password !== md5(password)) { // VuNA - accountController.test - AL1.2
      return res.json({ message: 'Incorrect password', status: 400 })
    }
    const token = account.token

    res.json({ // VuNA - accountController.test - AL1.3
      message: 'Login successful',
      status: 200,
      data: account,
    })
  } catch (error) {
    res.json({ message: 'Login failed', status: 500 })
  }
}

//[GET] /api/v1/admin/me
module.exports.adminMe = async (req, res) => {
  try { // VuNA - accountController.test - AM2.3
    const token = req.query.tokenID
    const account = await Account.findOne({ token })

    if (!account) { // VuNA - accountController.test - AM2.1
      return res.json({ message: 'Account not found', status: 400 })
    }
    return res.json({ message: 'Account details', status: 200, data: account }) // VuNA - accountController.test - AM2.2
  } catch (error) {
    res.json({ message: 'Get account failed', status: 500 })
  }
}

//[GET] /api/v1/admin/superAdmin/accounts
module.exports.getAccounts = async (req, res) => {
  try { // VuNA - accountController.test - GA5.2
    const accounts = await Account.find()
    res.json({ message: 'Accounts fetched successfully', status: 200, data: accounts }) // VuNA - accountController.test - GA5.1
  } catch (error) {
    res.json({ message: 'Get accounts failed', status: 500 })
  }
}

//[POST] /admin/superAdmin/account
module.exports.createAccount = async (req, res) => {
  try { // VuNA - accountController.test - CA6.2
    const { email, password, role } = req.body
    const token = generateRandomString(20)
    const newAccount = new Account({
      email,
      password: md5(password),
      role,
      token,
    })
    await newAccount.save()
    res.json({ message: 'Account created successfully', status: 200, data: newAccount }) // VuNA - accountController.test - CA6.1
  } catch (error) {
    console.error('Error creating account:', error)
    res.json({ message: 'Create account failed', status: 500 })
  }
}

//[PUT] /api/v1/admin/superAdmin/account/:accountId
module.exports.updateAccount = async (req, res) => {
  try { // VuNA - accountController.test - UA3.3
    const accountId = req.params.accountId
    const { email, password, role } = req.body
    const account = await Account.findById(accountId)
    if (!account) { // VuNA - accountController.test - UA3.1
      return res.json({ message: 'Account not found', status: 400 })
    }
    account.email = email
    account.password = md5(password)
    account.role = role
    await account.save()
    res.json({ message: 'Account updated successfully', status: 200, data: account }) // VuNA - accountController.test - UA3.2
  } catch (error) {
    res.json({ message: 'Update account failed', status: 500 })
  }
}

//[DELETE] /api/v1/admin/superAdmin/account/:accountId
module.exports.deleteAccount = async (req, res) => {
  try { // VuNA - accountController.test - DA4.3
    const accountId = req.params.accountId
    const account = await Account.findById(accountId)
    if (!account) { // VuNA - accountController.test - DA4.1
      return res.json({ message: 'Account not found', status: 400 })
    }
    await account.deleteOne()
    res.json({ message: 'Account deleted successfully', status: 200 }) // VuNA - accountController.test - DA4.2
  } catch (error) {
    res.json({ message: 'Delete account failed', status: 500 })
  }
}

// //[GET] /api/v1/admin/superAdmin/posts
// module.exports.getPosts = async (req, res) => {
//   try {
//     const posts = await Post.find()
//     res.json({ message: 'Posts fetched successfully', status: 200, data: posts })
//   } catch (error) {
//     res.json({ message: 'Get posts failed', status: 500 })
//   }
// }

// //[POST] /api/v1/admin/superAdmin/post
// module.exports.createPost = async (req, res) => {
//   try {
//     const { title, content } = req.body
//     const newPost = new Post({
//       title,
//       content,
//     })
//     await newPost.save()
//     res.json({ message: 'Post created successfully', status: 200, data: newPost })
//   } catch (error) {
//     res.json({ message: 'Create post failed', status: 500 })
//   }
// }

// //[PUT] /api/v1/admin/superAdmin/post/:postId
// module.exports.updatePost = async (req, res) => {
//   try {
//     const postId = req.params.postId
//     const { title, content } = req.body
//     const post = await Post.findById(postId)
//     if (!post) {
//       return res.json({ message: 'Post not found', status: 400 })
//     }
//     post.title = title
//     post.content = content
//     await post.save()
//     res.json({ message: 'Post updated successfully', status: 200, data: post })
//   } catch (error) {
//     res.json({ message: 'Update post failed', status: 500 })
//   }
// }

// //[DELETE] /api/v1/admin/superAdmin/post/:postId
// module.exports.deletePost = async (req, res) => {
//   try {
//     const postId = req.params.postId
//     const post = await Post.findById(postId)
//     if (!post) {
//       return res.json({ message: 'Post not found', status: 400 })
//     }
//     await post.remove()
//     res.json({ message: 'Post deleted successfully', status: 200 })
//   } catch (error) {
//     res.json({ message: 'Delete post failed', status: 500 })
//   }
// }

// //[GET] /api/v1/admin/superAdmin/displayedPosts
// module.exports.getDisplayedPosts = async (req, res) => {
//   try {
//     const topCities = await Booking.aggregate([
//       {
//         $lookup: {
//           from: 'hotels',
//           localField: 'hotelId',
//           foreignField: 'HotelId',
//           as: 'hotelInfo',
//         },
//       },
//       { $unwind: '$hotelInfo' },
//       {
//         $group: {
//           _id: '$hotelInfo.Address.City',
//           count: { $sum: 1 },
//         },
//       },
//       { $sort: { count: -1 } },
//       { $limit: 5 },
//     ])

//     const cityNames = topCities.map((city) => city._id)

//     const displayedPosts = await Post.find({ keyword: { $in: cityNames } })

//     res.json({
//       message: 'Displayed posts fetched successfully',
//       status: 200,
//       data: displayedPosts,
//     })
//   } catch (error) {
//     console.error('Error fetching displayed posts:', error)
//     res.json({ message: 'Get displayed posts failed', status: 500 })
//   }
// }

// //[GET] /api/v1/admin/superAdmin/displayedPlaces
// module.exports.getDisplayedPlaces = async (req, res) => {
//   try {
//     const topCountries = await Booking.aggregate([
//       {
//         $lookup: {
//           from: 'hotels',
//           localField: 'hotelId',
//           foreignField: 'HotelId',
//           as: 'hotelInfo',
//         },
//       },
//       { $unwind: '$hotelInfo' },
//       {
//         $group: {
//           _id: '$hotelInfo.Address.Country',
//           count: { $sum: 1 },
//         },
//       },
//       { $sort: { count: -1 } },
//       { $limit: 5 },
//     ])

//     const countryNames = topCountries.map((country) => country._id)

//     const displayedPlaces = await Post.find({ keyword: { $in: countryNames } })

//     res.json({
//       message: 'Displayed places fetched successfully',
//       status: 200,
//       data: displayedPlaces,
//     })
//   } catch (error) {
//     console.error('Error fetching displayed places:', error)
//     res.json({ message: 'Get displayed places failed', status: 500 })
//   }
// }

// //[GET] /api/v1/admin/superAdmin/displayedPostByID
// module.exports.getDisplayedPostByID = async (req, res) => {
//   try {
//     const postId = req.query.postId
//     const post = await Post.findById(postId)
//     if (!post) {
//       return res.json({ message: 'Post not found', status: 400 })
//     }
//     res.json({ message: 'Post fetched successfully', status: 200, data: post })
//   } catch (error) {
//     console.error('Error fetching displayed post:', error)
//     res.json({ message: 'Get displayed post failed', status: 500 })
//   }
// }

// //[GET] /api/v1/admin/superAdmin/displayedHotels
// module.exports.getDisplayedHotels = async (req, res) => {
//   try {
//     const topHotels = await Booking.aggregate([
//       {
//         $group: {
//           _id: '$hotelId',
//           count: { $sum: 1 },
//         },
//       },
//       { $sort: { count: -1 } },
//       { $limit: 5 },
//     ])

//     const hotelIds = topHotels.map((hotel) => hotel._id)

//     const displayedHotels = await Hotel.find({ HotelId: { $in: hotelIds } })

//     res.json({
//       message: 'Displayed hotels fetched successfully',
//       status: 200,
//       data: displayedHotels,
//     })
//   } catch (error) {
//     console.error('Error fetching displayed hotels:', error)
//     res.json({ message: 'Get displayed hotels failed', status: 500 })
//   }
// }


# Booking App API

## 📘 Introduction

The **Booking App API** is a RESTful backend built to manage hotel or property booking operations. It provides endpoints for user authentication, room listings, bookings, and reviews. Built using **Node.js**, **Express.js**, and **MongoDB**, it is designed to be scalable, modular, and easy to integrate with any frontend framework.

---

## ⚙️ Installation

### 1. Clone the repository
```bash
git clone https://github.com/lTieDat/booking-app-api.git
cd booking-app-api
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the root directory:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/booking-app
JWT_SECRET=your_jwt_secret
```

### 4. Run the development server
```bash
npm run dev
```

Server will start on `http://localhost:5000`.

---

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Example Endpoints

#### 🔐 Authentication
- `POST /auth/register` – Register a new user
- `POST /auth/login` – Login user and return JWT

#### 🏨 Rooms
- `GET /rooms` – Get all rooms
- `GET /rooms/:id` – Get a specific room
- `POST /rooms` – Add new room (admin only)

#### 📅 Bookings
- `POST /bookings` – Create a new booking
- `GET /bookings/user/:userId` – Get bookings for a user

#### ⭐ Reviews
- `POST /reviews` – Add a review
- `GET /reviews/room/:roomId` – Get reviews for a room

> Full API docs can be view in localhost port 8002 when running server

---

## 📁 Folder Structure

```bash
booking-app-api/
├── controllers/       # Route handler logic
├── models/            # Mongoose models
├── routes/            # Express routers
├── middlewares/       # Custom middleware (auth, error handling)
├── utils/             # Utility functions and helpers
├── config/            # DB and app config
├── .env               # Environment variables
├── server.js          # App entry point
└── package.json
```

---

## 🚀 Environment Setup for Production

1. **Install dependencies**
   ```bash
   npm install --production
   ```

2. **Use a process manager (e.g., PM2)**
   ```bash
   npm install -g pm2
   pm2 start server.js --name booking-api
   pm2 save
   ```

3. **Environment Configuration**
   - Set proper `.env` variables (e.g., use a production MongoDB URI, strong JWT secret).

4. **Reverse Proxy (Optional)**
   - Use Nginx or Apache to proxy requests to your Node.js server.

5. **Secure Your Server**
   - Enable HTTPS
   - Use firewall rules
   - Regularly update packages

---

## 🤝 Contributing

Contributions are welcome! Here’s how you can help:

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a pull request

### Development Guidelines
- Use descriptive commit messages.
- Follow existing project structure and naming conventions.
- Lint your code before committing.

---

## 📄 License

This project is licensed under the MIT License.

Link doc Unit test Jest: https://docs.google.com/document/d/1HqiWzErIl1Ti-oZ8entu2YH-S2RHSNbM88PiCv7T5Sk/edit?usp=sharing

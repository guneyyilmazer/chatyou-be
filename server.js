const express = require("express");
const cors = require("cors");
const http = require("http");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { initSocket } = require("./services/socketService");
const userRouter = require("./routers/userRouter");
const roomRouter = require("./routers/roomRouter");
const errorHandler = require("./utils/errorHandler");

dotenv.config();

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL, optionsSuccessStatus: 200 }));
app.use(express.json({ limit: "10mb" }));

// Database Connection
mongoose
  .connect(process.env.MONGODB_URI, { maxIdleTimeMS: 60000 })
  .then(() => console.log("Database connected"))
  .catch((err) => console.error("Database connection error:", err.message));

// Routes
app.use("/user", userRouter);
app.use("/room", roomRouter);

// Error Handling Middleware
app.use(errorHandler);

// Initialize Socket.io
initSocket(server);

// Start Server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

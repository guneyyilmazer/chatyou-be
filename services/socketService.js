const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { findRoom, prepareMessages, createRoom } = require("./roomService");
const dotenv = require("dotenv");
dotenv.config();

const formatTime = (time) => (time.length === 1 ? `0${time}` : time);

function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL,
    },
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("join-room", async (room, token) => {
      try {
        const { userId } = jwt.verify(token, process.env.SECRET);
        const roomInDB = await findRoom(userId, room);

        if (roomInDB) {
          socket.join(roomInDB.name);
          console.log(`Socket joined room: ${roomInDB.name}`);
        } else {
          socket.join(room);
          console.log(`Socket created/joined new room: ${room}`);
        }
      } catch (err) {
        console.error("Join room error:", err.message);
      }
    });

    socket.on(
      "send-msg",
      async (user, roomName, content, pictures, chattingWith) => {
        const date = new Date();
        try {
          const message = await handleMessageSend(
            user,
            roomName,
            content,
            pictures,
            chattingWith
          );
          io.to(message.roomName).emit(
            "receive-msg",
            user,
            content,
            pictures,
            {
              hour: formatTime(date.getHours().toString()),
              minute: formatTime(date.getMinutes().toString()),
            },
            ""
          );
        } catch (err) {
          console.error("Send message error:", err.message);
        }
      }
    );

    socket.on("typing", (user, room) => {
      try {
        io.to(room).emit("typing-to-client", user);
      } catch (err) {
        console.error("Typing event error:", err.message);
      }
    });

    socket.on("stopped-typing", (user, room) => {
      try {
        io.to(room).emit("stopped-typing-to-client", user);
      } catch (err) {
        console.error("Stopped typing event error:", err.message);
      }
    });

    socket.on("read-msg", async (room, chattingWith, user) => {
      try {
        const date = new Date();
        const roomInDB = await findRoom(user.userId, room, chattingWith);

        if (roomInDB) {
          const lastMessage = roomInDB.messages[roomInDB.messages.length - 1];

          if (!lastMessage.seenBy.some((seen) => seen.userId === user.userId)) {
            lastMessage.seenBy.push({ userId: user.userId, time: date });

            await roomInDB.save();

            const updatedMessage = await prepareMessages([lastMessage]);

            io.to(roomInDB.name).emit("update-message", updatedMessage);
          }
        }
      } catch (err) {
        console.error("Read message event error:", err.message);
      }
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  console.log("Socket.IO initialized");
}

async function handleMessageSend(
  user,
  roomName,
  content,
  pictures,
  chattingWith
) {
  const date = new Date();
  const room = await findRoom(user.userId, roomName, chattingWith);

  const message = {
    sender: user,
    content,
    pictures,
    sent: date,
    seenBy: [{ userId: user.userId, time: date }],
  };

  if (room) {
    room.messages.push(message);
    await room.save();
    return { ...message, roomName: room.name };
  }

  const newRoom = await createRoom(roomName, [user, chattingWith], [message]);
  return { ...message, roomName: newRoom.name };
}

module.exports = { initSocket };

const RoomModel = require("../schemas/roomSchema");
const UserModel = require("../schemas/userSchema");

// Find a room given userId, room name, and chattingWith user
async function findRoom(userId, roomName, chattingWith) {
  const privateRoomName = `${userId} ${chattingWith}`;
  const reverseRoomName = `${chattingWith} ${userId}`;

  return (
    (await RoomModel.findOne({ name: privateRoomName })) ||
    (await RoomModel.findOne({ name: reverseRoomName })) ||
    (await RoomModel.findOne({ name: roomName }))
  );
}

// Prepare messages with user details and format timestamps
async function prepareMessages(messages) {
  try {
    const processedMessages = messages.map(async (msg) => {
      const sender = await UserModel.findById(msg.sender.userId);
      const seenBy = await Promise.all(
        msg.seenBy.map(async (seen) => {
          const user = await UserModel.findById(seen.userId);
          return {
            userId: user._id,
            username: user.username,
            profilePicture: user.profilePicture,
          };
        })
      );

      // Format the sent time as HH:MM
      const formattedTime = `${msg.sent
        .getHours()
        .toString()
        .padStart(2, "0")}:${msg.sent
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;

      return {
        sent: formattedTime,
        sender: {
          userId: sender._id,
          username: sender.username,
          profilePicture: sender.profilePicture,
        },
        content: msg.content,
        pictures: msg.pictures,
        seenBy,
      };
    });

    return await Promise.all(processedMessages);
  } catch (err) {
    console.error("Error preparing messages:", err.message);
    throw err;
  }
}

// Create a new room with users and initial messages
async function createRoom(name, users, messages) {
  const room = new RoomModel({
    name,
    users,
    messages,
  });
  return room.save();
}

// Update the seenBy list of a specific message
async function updateMessageSeenBy(roomId, messageIndex, userId) {
  try {
    const room = await RoomModel.findById(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    const message = room.messages[messageIndex];
    const alreadySeen = message.seenBy.some((seen) => seen.userId === userId);

    if (!alreadySeen) {
      message.seenBy.push({ userId, time: new Date() });
      await room.save();
    }

    return message;
  } catch (err) {
    console.error("Error updating seenBy:", err.message);
    throw err;
  }
}

module.exports = {
  findRoom,
  prepareMessages,
  createRoom,
  updateMessageSeenBy,
};

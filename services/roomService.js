const RoomModel = require("../schemas/roomSchema");
const UserModel = require("../schemas/userSchema");

async function findRoom(userId, roomName, chattingWith) {
  const privateRoomName = `${userId} ${chattingWith}`;
  const reverseRoomName = `${chattingWith} ${userId}`;

  return (
    (await RoomModel.findOne({ name: privateRoomName })) ||
    (await RoomModel.findOne({ name: reverseRoomName })) ||
    (await RoomModel.findOne({ name: roomName }))
  );
}

async function prepareMessages(messages) {
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
    return {
      ...msg.toObject(),
      sender,
      seenBy,
    };
  });
  return Promise.all(processedMessages);
}

async function createRoom(name, users, messages) {
  const room = new RoomModel({
    name,
    users,
    messages,
  });
  return room.save();
}

async function loadRoom(userId, roomName, chattingWith, page) {
  try {
    const date = new Date();
    const roomInDB = await findRoom(userId, roomName, chattingWith);

    if (!roomInDB) {
      throw new Error("Room is empty.");
    }

    const messages = roomInDB.messages.map((msg) => {
      const alreadySeen = msg.seenBy.some((seen) => seen.userId === userId);
      if (!alreadySeen) {
        msg.seenBy.push({ userId, time: date });
      }
      return msg;
    });

    await RoomModel.updateOne({ name: roomInDB.name }, { messages });

    const pageSize = 5;
    const startIndex = messages.length - page * pageSize;
    const endIndex = startIndex + pageSize;

    const slicedMessages =
      startIndex >= 0
        ? messages.slice(startIndex, endIndex)
        : messages.slice(0, endIndex);

    const readyMessages = await prepareMessages(slicedMessages);

    return { messages: readyMessages, roomIsEmpty: false };
  } catch (error) {
    if (error.message === "Room is empty.") {
      return { error: error.message, roomIsEmpty: true };
    }
    throw error;
  }
}

module.exports = { findRoom, prepareMessages, createRoom, loadRoom };

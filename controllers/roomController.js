const RoomModel = require("../schemas/roomSchema");
const UserModel = require("../schemas/userSchema");
const { findRoom, prepareMessages } = require("../utils/roomUtils");

exports.loadRoom = async (req, res) => {
  try {
    const { room, chattingWith, userId, page } = req.body;
    const roomInDB = await findRoom(userId, room, chattingWith);

    if (!roomInDB) {
      return res
        .status(400)
        .json({ error: "Room is empty.", roomIsEmpty: true });
    }

    const messages = roomInDB.messages.map((msg) => {
      const alreadySeen = msg.seenBy.some((seen) => seen.userId === userId);
      if (!alreadySeen) {
        msg.seenBy.push({ userId, time: new Date() });
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

    res.status(200).json({ messages: readyMessages });
  } catch (err) {
    console.error(err.message);
    res.status(400).json({ error: err.message });
  }
};

exports.loadRooms = async (req, res) => {
  try {
    const { page, amount } = req.body;
    if (!page || !amount) {
      throw new Error("You need to specify the page and the amount.");
    }

    const rooms = await RoomModel.find({ privateRoom: false })
      .limit(amount)
      .skip((page - 1) * amount)
      .select("name");
    const allRooms = await RoomModel.find({ privateRoom: false })
      .limit(amount + 1)
      .select("name");

    res.status(200).json({
      rooms,
      loadedAll: allRooms.length === amount ? true : false,
    });
  } catch (err) {
    console.error(err.message);
    res.status(400).json({ error: err.message });
  }
};

exports.findRoom = async (req, res) => {
  try {
    const { room } = req.body;
    const Rooms = await RoomModel.find({
      name: { $regex: room, $options: "i" },
      privateRoom: false,
    })
      .limit(20)
      .select("name");

    const filteredRooms = Rooms.filter(
      (item) => item.name.includes(room) && !item.privateRoom
    );

    res
      .status(200)
      .json({ rooms: filteredRooms, notFound: filteredRooms.length === 0 });
  } catch (err) {
    console.error(err.message);
    res.status(400).json({ error: err.message });
  }
};

exports.loadPrivateRooms = async (req, res) => {
  try {
    const limit = 10;
    const rooms = await RoomModel.find({ "users.userId": req.userId })
      .limit(limit)
      .select("name users messages");

    const roomsWithDetails = await Promise.all(
      rooms.map(async (room) => {
        const usersWithDetails = await Promise.all(
          room.users.map(async (user) => {
            const userDetails = await UserModel.findById(user.userId);
            return {
              userId: userDetails._id,
              username: userDetails.username,
              profilePicture: userDetails.profilePicture,
            };
          })
        );

        const lastMessage = room.messages[room.messages.length - 1];
        const formattedSentTime = `${lastMessage.sent
          .getHours()
          .toString()
          .padStart(2, "0")}:${lastMessage.sent
          .getMinutes()
          .toString()
          .padStart(2, "0")}`;

        return {
          name: room.name,
          lastMessage: {
            sender: lastMessage.sender,
            content: lastMessage.content,
            sent: formattedSentTime,
            seenBy: lastMessage.seenBy.map((seen) => seen.userId),
          },
          users: usersWithDetails,
        };
      })
    );

    res.status(200).json({ rooms: roomsWithDetails });
  } catch (err) {
    console.error(err.message);
    res.status(400).json({ error: err.message });
  }
};

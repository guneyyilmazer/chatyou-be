const express = require("express");
const {
  loadRoom,
  loadRooms,
  findRoom,
  loadPrivateRooms,
} = require("../controllers/roomController");
const withAuth = require("../middleware/withAuth");

const router = express.Router();

router.post("/loadRoom", withAuth, loadRoom);
router.post("/loadRooms", withAuth, loadRooms);
router.post("/findRoom", withAuth, findRoom);
router.post("/loadPrivateRooms", withAuth, loadPrivateRooms);

module.exports = router;

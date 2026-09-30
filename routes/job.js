const express = require("express");
var jobController = require("../controllers/jobController");

const router = express.Router();

router.post("/", jobController.createJob);

module.exports = router;
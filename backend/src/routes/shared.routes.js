const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const sharedController = require('../controllers/shared.controller');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/users', asyncHandler(sharedController.getUsers));
router.get('/services', asyncHandler(sharedController.getServices));
router.get('/incidents', asyncHandler(sharedController.getIncidents));

module.exports = router;

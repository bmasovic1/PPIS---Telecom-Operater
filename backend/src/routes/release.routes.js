const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const releaseController = require('../controllers/release.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/pipeline', authorizeRoles('admin', 'release_manager', 'change_manager', 'devops', 'cab_clan'), asyncHandler(releaseController.getPipeline));
router.get('/rfc', authorizeRoles('admin', 'release_manager', 'change_manager', 'devops', 'cab_clan'), asyncHandler(releaseController.getRfcs));
router.get('/rfc/:id', authorizeRoles('admin', 'release_manager', 'change_manager', 'devops', 'cab_clan'), asyncHandler(releaseController.getRfcById));
router.post('/rfc', authorizeRoles('admin', 'release_manager', 'change_manager'), asyncHandler(releaseController.createRfc));
router.put('/rfc/:id/cab', authorizeRoles('admin', 'change_manager', 'cab_clan'), asyncHandler(releaseController.updateCabDecision));
router.put('/:id/go-no-go', authorizeRoles('admin', 'release_manager'), asyncHandler(releaseController.updateGoNoGo));
router.put('/:id/deploy', authorizeRoles('admin', 'release_manager', 'devops'), asyncHandler(releaseController.scheduleDeploy));
router.put('/:id/pir', authorizeRoles('admin', 'release_manager', 'qa_inzenjer'), asyncHandler(releaseController.updatePir));
router.put('/:id/rollback', authorizeRoles('admin', 'release_manager', 'devops'), asyncHandler(releaseController.updateRollback));

module.exports = router;

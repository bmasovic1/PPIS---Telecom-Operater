const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const problemController = require('../controllers/problem.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/', authorizeRoles('admin', 'problem_manager', 'noc_operater', 'it_inzenjer'), asyncHandler(problemController.getProblems));
router.get('/active', authorizeRoles('admin', 'problem_manager', 'noc_operater', 'it_inzenjer'), asyncHandler(problemController.getActiveProblems));
router.get('/trend', authorizeRoles('admin', 'problem_manager', 'noc_operater', 'it_inzenjer'), asyncHandler(problemController.getProblemTrend));
router.get('/metrics', authorizeRoles('admin', 'problem_manager', 'noc_operater', 'it_inzenjer'), asyncHandler(problemController.getProblemMetrics));
router.get('/kedb', authorizeRoles('admin', 'problem_manager', 'noc_operater', 'it_inzenjer'), asyncHandler(problemController.getKedb));
router.post('/kedb', authorizeRoles('admin', 'problem_manager', 'it_inzenjer'), asyncHandler(problemController.createKedb));
router.get('/kedb/:id', authorizeRoles('admin', 'problem_manager', 'noc_operater', 'it_inzenjer'), asyncHandler(problemController.getKedbById));
router.put('/kedb/:id', authorizeRoles('admin', 'problem_manager', 'it_inzenjer'), asyncHandler(problemController.updateKedb));
router.get('/:id', authorizeRoles('admin', 'problem_manager', 'noc_operater', 'it_inzenjer'), asyncHandler(problemController.getProblemById));
router.post('/', authorizeRoles('admin', 'problem_manager', 'it_inzenjer'), asyncHandler(problemController.createProblem));
router.put('/:id/rca', authorizeRoles('admin', 'problem_manager', 'it_inzenjer'), asyncHandler(problemController.updateProblemRca));
router.put('/:id/status', authorizeRoles('admin', 'problem_manager', 'it_inzenjer'), asyncHandler(problemController.updateProblemStatus));
router.put('/:id/incidents', authorizeRoles('admin', 'problem_manager', 'it_inzenjer'), asyncHandler(problemController.updateProblemIncidents));

module.exports = router;

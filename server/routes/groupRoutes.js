const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authRole = require('../middleware/authRole');
const groupController = require('../controllers/groupController');

// @route   POST /api/groups
// @desc    Create a group
// @access  Private (Admin, Moderator)
router.post('/', [auth, authRole(['Admin', 'Moderator'])], groupController.createGroup);

// @route   GET /api/groups
// @desc    Get all visible groups
// @access  Private
router.get('/', auth, groupController.getGroups);

// @route   GET /api/groups/:id
// @desc    Get a specific group by ID
// @access  Private
router.get('/:id', auth, groupController.getGroupById);

// @route   POST /api/groups/:id/join
// @desc    Join a group
// @access  Private
router.post('/:id/join', auth, groupController.joinGroup);

// @route   PUT /api/groups/:id/approve/:userId
// @desc    Approve a pending member
// @access  Private
router.put('/:id/approve/:userId', auth, groupController.approveMember);

// @route   PUT /api/groups/:id/role/:userId
// @desc    Assign Moderator role (Global Admin only)
// @access  Private (Admin)
router.put('/:id/role/:userId', [auth, authRole(['Admin'])], groupController.assignRole);

// @route   DELETE /api/groups/:id/members/:userId
// @desc    Remove a member
// @access  Private
router.delete('/:id/members/:userId', auth, groupController.removeMember);

// @route   DELETE /api/groups/:id
// @desc    Delete a group
// @access  Private (Admin)
router.delete('/:id', [auth, authRole(['Admin'])], groupController.deleteGroup);

// @route   POST /api/groups/:id/resources
// @desc    Add a resource
// @access  Private
router.post('/:id/resources', auth, groupController.addResource);

// @route   DELETE /api/groups/:id/resources/:resourceId
// @desc    Delete a resource
// @access  Private
router.delete('/:id/resources/:resourceId', auth, groupController.deleteResource);

module.exports = router;

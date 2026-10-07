/**
 * Group Controller
 * Manages group creation, membership, and resource sharing (files, announcements, deadlines).
 */
const Group = require('../models/Group');
const User = require('../models/User'); // Import User model
const mongoose = require('mongoose');

/**
 * @route   POST /api/groups
 * @desc    Create a new study group
 * @access  Private
 */
exports.createGroup = async (req, res) => {
    try {
        const { name, description, rules, coverImage, isPublic } = req.body;

        const newGroup = new Group({
            name,
            description,
            rules,
            coverImage,
            isPublic,
            createdBy: req.user.id,
            // The creator is automatically added as a Moderator
            members: [{ user: req.user.id, role: 'Moderator', status: 'Approved' }]
        });

        const group = await newGroup.save();

        // Promotion Logic: If the creator is a Student, promote them to Moderator globally
        const user = await User.findById(req.user.id);
        if (user && user.role === 'Student') {
            user.role = 'Moderator';
            await user.save();
        }

        res.status(201).json(group);
    } catch (err) {
        console.error("CREATE GROUP ERROR:", err);
        res.status(500).json({ message: 'Failed to create group', details: err.message });
    }
};

/**
 * @route   GET /api/groups
 * @desc    Fetch all groups with aggregated stats (member counts, etc.)
 * @access  Private
 */
exports.getGroups = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.id);

        const groups = await Group.aggregate([
            {
                $project: {
                    name: 1,
                    description: 1,
                    isPublic: 1,
                    coverImage: 1,
                    createdAt: 1,
                    createdBy: 1,
                    memberCount: { $size: { $ifNull: ["$members", []] } },
                    resourceCount: { $size: { $ifNull: ["$resources", []] } },
                    isApprovedMember: {
                        $gt: [
                            {
                                $size: {
                                    $filter: {
                                        input: { $ifNull: ["$members", []] },
                                        as: "m",
                                        cond: {
                                            $and: [
                                                { $eq: ["$$m.user", userId] },
                                                { $eq: ["$$m.status", "Approved"] }
                                            ]
                                        }
                                    }
                                }
                            },
                            0
                        ]
                    }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "createdBy",
                    foreignField: "_id",
                    as: "createdBy"
                }
            },
            {
                $unwind: {
                    path: "$createdBy",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    "createdBy.password": 0,
                    "createdBy.__v": 0,
                    "createdBy.tokens": 0
                }
            },
            { $sort: { createdAt: -1 } }
        ]);

        res.json(groups);
    } catch (err) {
        console.error("GET GROUPS ERROR:", err);
        res.status(500).send('Server Error');
    }
};

/**
 * @route   GET /api/groups/:id
 * @desc    Fetch a specific group by its ID
 * @access  Private
 */
exports.getGroupById = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id)
            .populate('createdBy', 'name email role')
            .populate('members.user', 'name email role');

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Logic check: Approved check is handled by frontend UI layers
        res.json(group);
    } catch (err) {
        console.error('Get Group Error:', err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Invalid Group ID' });
        }
        res.status(500).json({ message: 'Server Error fetching group details' });
    }
};

// @route   POST /api/groups/:id/join
// @desc    Join a public group or request to join a private group
// @access  Private
exports.joinGroup = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ message: 'Group not found' });

        // Check if already a member or pending
        const existingMember = group.members.find(m => m.user.toString() === req.user.id);
        if (existingMember) {
            return res.status(400).json({ message: `You are already a ${existingMember.status} member of this group` });
        }

        const newMember = {
            user: req.user.id,
            role: 'Member',
            status: group.isPublic ? 'Approved' : 'Pending'
        };

        group.members.push(newMember);
        await group.save();

        res.json({ message: group.isPublic ? 'Successfully joined the group' : 'Join request sent', group });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @route   PUT /api/groups/:id/approve/:userId
// @desc    Approve a pending member
// @access  Private (Admin/Moderator)
exports.approveMember = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ message: 'Group not found' });

        // Verify requester is Admin or Moderator of this group
        const requester = group.members.find(m => m.user.toString() === req.user.id && (m.role === 'Moderator' || req.user.role === 'Admin'));
        if (!requester && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Not authorized to approve members' });
        }

        const memberIndex = group.members.findIndex(m => m.user.toString() === req.params.userId && m.status === 'Pending');
        if (memberIndex === -1) {
            return res.status(404).json({ message: 'Pending member not found' });
        }

        group.members[memberIndex].status = 'Approved';
        await group.save();

        res.json({ message: 'Member approved successfully', members: group.members });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @route   PUT /api/groups/:id/role/:userId
// @desc    Assign Moderator role
// @access  Private (Admin only)
exports.assignRole = async (req, res) => {
    try {
        const { role } = req.body; // 'Member' or 'Moderator'
        if (!['Member', 'Moderator'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ message: 'Group not found' });

        const memberIndex = group.members.findIndex(m => m.user.toString() === req.params.userId && m.status === 'Approved');
        if (memberIndex === -1) {
            return res.status(404).json({ message: 'Approved member not found' });
        }

        group.members[memberIndex].role = role;
        await group.save();

        // Sync to global User model if promoted to Moderator
        if (role === 'Moderator') {
            const user = await User.findById(req.params.userId);
            if (user && user.role === 'Student') {
                user.role = 'Moderator';
                await user.save();
            }
        }

        res.json({ message: `Role updated to ${role}`, members: group.members });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @route   DELETE /api/groups/:id/members/:userId
// @desc    Remove a member
// @access  Private (Admin/Moderator)
exports.removeMember = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ message: 'Group not found' });

        // Prevent members from removing others. Only Admins or Group Moderators can remove.
        const requester = group.members.find(m => m.user.toString() === req.user.id && (m.role === 'Moderator' || req.user.role === 'Admin'));
        if (!requester && req.user.role !== 'Admin') {
            // A user can remove themselves (leave group)
            if (req.params.userId !== req.user.id) {
                return res.status(403).json({ message: 'Not authorized to remove this member' });
            }
        }

        group.members = group.members.filter(m => m.user.toString() !== req.params.userId);
        await group.save();

        res.json({ message: 'Member removed', members: group.members });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @route   DELETE /api/groups/:id
// @desc    Delete a group
// @access  Private (Admin only)
exports.deleteGroup = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ message: 'Group not found' });

        await Group.findByIdAndDelete(req.params.id);
        res.json({ message: 'Group deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @route   POST /api/groups/:id/resources
// @desc    Add a resource (File, Link, or Deadline)
// @access  Private (Admin/Moderator)
exports.addResource = async (req, res) => {
    try {
        const { type, title, content, dueDate } = req.body;

        if (!['File', 'Link', 'Deadline'].includes(type)) {
            return res.status(400).json({ message: 'Invalid resource type' });
        }

        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ message: 'Group not found' });

        const requester = group.members.find(m => m.user.toString() === req.user.id && m.status === 'Approved');

        const isAdmin = req.user.role?.toLowerCase() === 'admin' || req.user.globalRole?.toLowerCase() === 'admin';

        if (!requester && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const isModOrAdmin = isAdmin || requester?.role === 'Moderator';

        if (type !== 'File' && !isModOrAdmin) {
            return res.status(403).json({ message: 'Only Moderators and Admins can add links and deadlines' });
        }

        const newResource = {
            type,
            title,
            content,
            dueDate,
            createdBy: req.user.id
        };

        group.resources.push(newResource);
        await group.save();

        res.json({ message: 'Resource added successfully', resources: group.resources });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @route   DELETE /api/groups/:id/resources/:resourceId
// @desc    Delete a resource
// @access  Private (Admin/Moderator)
exports.deleteResource = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ message: 'Group not found' });

        const isAdmin = req.user.role?.toLowerCase() === 'admin' || req.user.globalRole?.toLowerCase() === 'admin';
        const requester = group.members.find(m => m.user.toString() === req.user.id && (m.role === 'Moderator' || isAdmin));
        if (!requester && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized to delete resources' });
        }

        group.resources = group.resources.filter(r => r._id.toString() !== req.params.resourceId);
        await group.save();

        res.json({ message: 'Resource deleted', resources: group.resources });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

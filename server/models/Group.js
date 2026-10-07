const mongoose = require('mongoose');

const MemberSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    role: {
        type: String,
        enum: ['Member', 'Moderator'],
        default: 'Member'
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved'],
        default: 'Approved' // Public groups approve automatically
    },
    joinedAt: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

const ResourceSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['File', 'Link', 'Deadline'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    content: {
        type: String, // URL for links/files, Description for deadlines
    },
    dueDate: {
        type: Date, // Only for deadlines
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const GroupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
    },
    rules: {
        type: String,
    },
    coverImage: {
        type: String, // Store Image URL or GridFS ID
    },
    isPublic: {
        type: Boolean,
        default: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    members: [MemberSchema],
    resources: [ResourceSchema],
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Group', GroupSchema);

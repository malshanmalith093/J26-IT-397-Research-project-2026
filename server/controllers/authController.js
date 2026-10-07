/**
 * Authentication Controller
 * Handles user registration, login, and profile retrieval.
 * Uses JWT for stateless authentication and BcryptJS for password hashing.
 */
const User = require('../models/User');
const Group = require('../models/Group');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Helper to determine user's effective role based on global role and group moderator status.
 */
const getEffectiveRole = async (user) => {
    // If Admin, they stay Admin
    if (user.role === 'Admin') return 'Admin';
    if (user.role === 'Moderator') return 'Moderator';

    // Check if they are a moderator in ANY group
    const isGroupMod = await Group.findOne({
        'members': {
            $elemMatch: {
                user: user._id,
                role: 'Moderator',
                status: 'Approved'
            }
        }
    });

    return isGroupMod ? 'Moderator' : user.role;
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
exports.register = async (req, res) => {
    const { name, email, password } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();

    try {
        // 1. Check if user already exists
        let user = await User.findOne({ email: normalizedEmail });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // 2. Assign default role (Admin for specific SLIIT email, else Student)
        let userRole = 'Student';
        if (normalizedEmail === 'admin@sliit.lk') {
            userRole = 'Admin';
        }

        // 3. Create new user instance
        user = new User({
            name,
            email: normalizedEmail,
            password,
            role: userRole
        });

        // 4. Hash password before saving
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        // 5. Generate JWT Payload
        const payload = {
            user: {
                id: user.id,
                role: user.role
            },
        };

        // 6. Sign and return token
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '7d' },
            (err, token) => {
                if (err) throw err;
                res.json({
                    token,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role
                    }
                });
            }
        );
    } catch (err) {
        console.error('Registration Error:', err.message);
        res.status(500).json({ message: 'Server Error during registration' });
    }
};

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
exports.login = async (req, res) => {
    const { email, password } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();

    try {
        // 1. Verify user exists
        let user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        // 2. Validate password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        // Get effective role (checking group moderator status)
        const effectiveRole = await getEffectiveRole(user);

        // 3. Generate JWT
        const payload = {
            user: {
                id: user.id,
                role: effectiveRole // Use effective role in token
            },
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '7d' },
            (err, token) => {
                if (err) throw err;
                res.json({
                    token,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: effectiveRole
                    }
                });
            }
        );
    } catch (err) {
        console.error('Login Error:', err.message);
        res.status(500).json({ message: 'Server Error during login' });
    }
};

/**
 * @route   GET /api/auth/me
 * @desc    Return the profile of the currently authenticated user
 * @access  Private
 */
exports.getMe = async (req, res) => {
    try {
        // Find user by ID extracted from JWT token in middleware
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Compute effective role dynamically
        const effectiveRole = await getEffectiveRole(user);

        // Return user with correct role
        const userData = user.toObject();
        userData.role = effectiveRole;

        res.json(userData);
    } catch (err) {
        console.error('Get Profile Error:', err.message);
        res.status(500).json({ message: 'Server Error fetching user profile' });
    }
};

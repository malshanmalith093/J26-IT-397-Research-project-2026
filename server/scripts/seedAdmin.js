require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const email = 'student@gmail.com';
    const plainPassword = 'student@123';
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    await User.updateOne(
      { email },
      {
        $set: {
          name: 'System Admin',
          email,
          password: passwordHash,
          role: 'Admin',
        },
      },
      { upsert: true }
    );

    const user = await User.findOne({ email }).select('name email role');
    console.log('ADMIN_READY', JSON.stringify(user));

    await mongoose.disconnect();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();

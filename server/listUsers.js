require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const users = await User.find({}).select('email role');
    console.log('USERS_LIST', JSON.stringify(users));
    await mongoose.disconnect();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();

/**
 * SLIIT Connect - Server Entry Point
 * Initializes Express, MongoDB connection, and sets up routing middleware.
 */
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware setup
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json({ limit: '50mb' })); // Parse JSON bodies with custom limit for image uploads
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Global Request Logger
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        const dbName = mongoose.connection.name;
        console.log(`Connected to MongoDB database: ${dbName}`);
    })
    .catch(err => console.error('MongoDB connection error:', err));

app.get('/', (req, res) => {
    res.send('SLIIT Connect API is running...');
});

// Auth Routes
app.use('/api/auth', require('./routes/auth'));

// Group Routes
app.use('/api/groups', require('./routes/groupRoutes'));


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;
const cors = require('cors');
const apiRoutes = require('./routes/api');

//Use CORS
app.use(cors());

// Middleware to parse JSON bodies
app.use(express.json());

// Import routes
app.use('/api', apiRoutes);

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
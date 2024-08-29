const express = require('express');
const router = express.Router();

// Define a basic route
router.get('/summary', (req, res) => {
  res.json({ message: 'TESTING ENDPOINT.' });
});

module.exports = router;
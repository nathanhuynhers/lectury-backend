const express = require('express');
const cors = require('cors');
const axios = require('axios');
const router = express.Router();
const he = require('he');
require('dotenv').config();
const { YoutubeTranscript } = require('youtube-transcript');

function decodeHtmlEntities(str) {
    // Decode once
    let decodedStr = he.decode(str);
  
    // Decode again in case of double encoding
    decodedStr = he.decode(decodedStr);
    
    return decodedStr;
}

// Define a basic route
router.post('/generate-summary', async (req, res) => {
  const { videoURL } = req.body;
  if (!videoURL) {
    return res.status(400).json({ error: 'Text is required to generate a summary.' });
  }
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoURL);
    let newTranscript = '';
    for (let i = 0; i < transcript.length; i++) {
      newTranscript +=  `${transcript[i].text}\n`;
    }
    newTranscript = decodeHtmlEntities(newTranscript);
    // Make a request to OpenAI API
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',  // or 'gpt-4' if you have access
        messages: [{ role: 'user', content: `Summarize the following text: ${newTranscript}` }],
        max_tokens: 1000,  // Adjust as needed to control the length of the summary
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,  // Replace with your OpenAI API key
          'Content-Type': 'application/json',
        },
      }
    );

    // Extract the summary from the API response
    const summary = response.data.choices[0].message.content;

    // Send the summary back to the frontend
    res.json({ summary });
  } catch (error) {
    console.error('Error fetching summary from OpenAI:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Error generating summary' });
  }
});

module.exports = router;
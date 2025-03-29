const express = require('express');
const cors = require('cors');
const axios = require('axios');
const router = express.Router();
const he = require('he');
require('dotenv').config();
const { YoutubeTranscript } = require('youtube-transcript');
const multer = require('multer');
const fs = require('fs/promises');
const FormData = require('form-data');

// Multer setup for handling MP4 file uploads
const upload = multer({ dest: 'uploads/' });

async function generateSummaryFromText(text) {
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'user',
        content: `Summarize the following transcript into clear, concise notes as if you are helping a student or professional study or review the material.
      
      Organize the content by topics or themes, and include key takeaways, examples, or definitions when relevant.
      
      Avoid unnecessary filler, and focus on capturing the important information for quick reading and comprehension. Keep it nice detailed and well formatted paragraphs.
      
      Transcript:\n\n${text}`
      }],
      max_tokens: 4096,
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data.choices[0].message.content;
}

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
    const transcript = await YoutubeTranscript.fetchTranscript(videoURL, { lang: 'en' });
    let newTranscript = '';
    for (let i = 0; i < transcript.length; i++) {
      newTranscript +=  `${transcript[i].text}\n`;
    }
    newTranscript = decodeHtmlEntities(newTranscript);

    // Extract the summary from the API response
    const summary = await generateSummaryFromText(newTranscript);

    // Send the summary back to the frontend
    res.json({ summary });
  } catch (error) {
    console.error('Error fetching summary from OpenAI:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Error generating summary' });
  }
});

// Route for audio/video upload and Whisper transcription
router.post('/upload-video', upload.single('video'), async (req, res) => {
  const filePath = req.file.path;

  try {
    const formData = new FormData();
    formData.append('file', await fs.readFile(filePath), {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });
    formData.append('model', 'whisper-1');

    const whisperResponse = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    const transcriptText = whisperResponse.data.text;
    const summary = await generateSummaryFromText(transcriptText);

    res.json({
      transcript: transcriptText,
      summary: summary,
    });

  } catch (error) {
    console.error('Error transcribing file:', error);
    res.status(500).json({ error: 'Failed to transcribe file.' });
  } finally {
    try {
      await fs.unlink(filePath);
    } catch (err) {
      console.warn('Error cleaning up file:', err);
    }
  }
});

module.exports = router;
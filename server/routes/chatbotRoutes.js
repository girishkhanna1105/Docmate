const express = require('express');
const ChatSession = require('../models/ChatSession');
const Disease = require('../models/Disease');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const router = express.Router();

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// POST: Start a new chat session
router.post('/session', async (req, res) => {
  try {
    const sessionId = uuidv4();
    const { userInfo } = req.body;

    const chatSession = new ChatSession({
      sessionId,
      userInfo,
      messages: [{
        sender: 'bot',
        message: 'Hello! I\'m DocMate AI powered by LLaMA. I can help you understand your symptoms and provide health guidance. How are you feeling today?',
        messageType: 'text'
      }]
    });

    await chatSession.save();

    res.status(201).json({
      success: true,
      data: {
        sessionId,
        message: chatSession.messages[0]
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create chat session' });
  }
});

// POST: Send message
router.post('/message', async (req, res) => {
  try {
    const { sessionId, message, symptoms } = req.body;
    const session = await ChatSession.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({ success: false, error: 'Chat session not found' });
    }

    session.messages.push({
      sender: 'user',
      message,
      messageType: symptoms ? 'symptom_check' : 'text'
    });

    let botResponseText = '';
    let assessment = null;

    if (symptoms && symptoms.length > 0) {
      session.symptoms = symptoms;

      const matchingDiseases = await Disease.find({
        symptoms: { $in: symptoms.map(s => new RegExp(s.symptom, 'i')) }
      }).limit(3);

      assessment = {
        possibleConditions: matchingDiseases.map(d => d.name),
        recommendations: [
          'Monitor your symptoms closely',
          'Stay hydrated and get adequate rest',
          'Consider consulting a healthcare professional'
        ],
        urgencyLevel: 'Medium',
        shouldSeeDoctor: symptoms.some(s => s.severity === 'Severe')
      };

      session.assessment = assessment;

      botResponseText = `Based on your symptoms, here are some possible conditions: ${assessment.possibleConditions.join(', ')}. ${assessment.shouldSeeDoctor ? 'I recommend consulting with a doctor soon.' : 'Please monitor your symptoms and consult a doctor if they worsen.'}`;
    } else {
      // 🤖 Groq API integration with LLaMA-3-8B
      const groqResponse = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama3-8b-8192',
          messages: [
            { role: 'system', content: 'You are a helpful and polite AI health assistant named DocMate. Answer like a doctor, but simply and kindly.' },
            { role: 'user', content: message }
          ],
          temperature: 0.7,
          max_tokens: 512
        },
        {
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      botResponseText = groqResponse.data.choices[0].message.content.trim();
    }

    session.messages.push({
      sender: 'bot',
      message: botResponseText,
      messageType: symptoms ? 'recommendation' : 'text'
    });

    await session.save();

    res.json({
      success: true,
      data: {
        botMessage: session.messages[session.messages.length - 1],
        assessment: session.assessment
      }
    });
  } catch (error) {
    console.error('Groq error:', error?.response?.data || error.message);
    res.status(500).json({ success: false, error: 'AI service is currently unavailable. Please try again later.' });
  }
});

router.get('/session/:sessionId', async (req, res) => {
  try {
    const session = await ChatSession.findOne({ sessionId: req.params.sessionId });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Chat session not found' });
    }

    res.json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch chat session' });
  }
});

module.exports = router;

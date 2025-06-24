const express = require('express');
const ChatSession = require('../models/ChatSession');
const Disease = require('../models/Disease');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios'); // You'll need to install this: npm install axios
const router = express.Router();

// Add your OpenAI API key here or in environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'your-openai-api-key-here';

// OpenAI API call function
async function getAIResponse(userMessage, conversationHistory = []) {
  try {
    const messages = [
      {
        role: "system",
        content: `You are DocMate AI, a helpful medical assistant chatbot. You provide health information, guidance, and support. 
        
        Important guidelines:
        - Always be empathetic and supportive
        - Provide helpful health information but always remind users to consult healthcare professionals for serious concerns
        - Never provide specific medical diagnoses
        - Be conversational and friendly
        - If users mention serious symptoms (chest pain, difficulty breathing, severe injuries), advise them to seek immediate medical attention
        - Keep responses concise but informative
        - You can discuss symptoms, general health advice, wellness tips, and when to see a doctor`
      },
      ...conversationHistory,
      {
        role: "user",
        content: userMessage
      }
    ];

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-3.5-turbo", // or "gpt-4" if you have access
      messages: messages,
      max_tokens: 300,
      temperature: 0.7,
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API Error:', error.response?.data || error.message);
    
    // Fallback responses if API fails
    const fallbackResponses = [
      "I'm having trouble connecting right now. Can you tell me more about how you're feeling?",
      "I apologize for the technical difficulty. Please describe your symptoms and I'll do my best to help.",
      "There seems to be a connection issue. In the meantime, if you're experiencing severe symptoms, please consider consulting a healthcare professional.",
      "I'm experiencing some technical difficulties. Could you rephrase your question?"
    ];
    
    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
  }
}

// Helper function to build conversation history for context
function buildConversationHistory(messages, limit = 6) {
  // Get recent messages for context, excluding system messages
  const recentMessages = messages.slice(-limit).map(msg => ({
    role: msg.sender === 'user' ? 'user' : 'assistant',
    content: msg.message
  }));
  
  return recentMessages;
}

// POST /api/chatbot/session - Start new chat session
router.post('/session', async (req, res) => {
  try {
    const sessionId = uuidv4();
    const { userInfo } = req.body;
    
    const welcomeMessage = "Hello! I'm DocMate AI, your personal health assistant. I'm here to help you understand your symptoms, provide health guidance, and support your wellness journey. How are you feeling today? 😊";
    
    const chatSession = new ChatSession({
      sessionId,
      userInfo,
      messages: [{
        sender: 'bot',
        message: welcomeMessage,
        messageType: 'text',
        timestamp: new Date()
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
    console.error('Session creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create chat session'
    });
  }
});

// POST /api/chatbot/message - Send message to chatbot
router.post('/message', async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    
    if (!sessionId || !message) {
      return res.status(400).json({
        success: false,
        error: 'Session ID and message are required'
      });
    }
    
    const session = await ChatSession.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Chat session not found'
      });
    }
    
    // Add user message to session
    const userMessage = {
      sender: 'user',
      message: message.trim(),
      messageType: 'text',
      timestamp: new Date()
    };
    
    session.messages.push(userMessage);
    
    // Build conversation history for AI context
    const conversationHistory = buildConversationHistory(session.messages);
    
    // Get AI response
    const aiResponse = await getAIResponse(message, conversationHistory);
    
    // Add bot response to session
    const botMessage = {
      sender: 'bot',
      message: aiResponse,
      messageType: 'text',
      timestamp: new Date()
    };
    
    session.messages.push(botMessage);
    
    // Save session
    await session.save();
    
    res.json({
      success: true,
      data: {
        userMessage,
        botMessage,
        sessionId
      }
    });
    
  } catch (error) {
    console.error('Message processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process message'
    });
  }
});

// POST /api/chatbot/analyze - Symptom analysis (enhanced with AI)
router.post('/analyze', async (req, res) => {
  try {
    const { sessionId, symptoms } = req.body;
    
    const session = await ChatSession.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Chat session not found'
      });
    }
    
    // Create a detailed symptom description for AI
    const symptomDescription = symptoms.map(s => 
      `${s.symptom} (${s.severity} severity, lasting ${s.duration})`
    ).join(', ');
    
    const analysisPrompt = `I have the following symptoms: ${symptomDescription}. 
    Can you provide some general information about what these symptoms might indicate and give me some general health advice? 
    Please remember I'll consult with a healthcare professional for proper diagnosis.`;
    
    // Get AI analysis
    const conversationHistory = buildConversationHistory(session.messages);
    const aiAnalysis = await getAIResponse(analysisPrompt, conversationHistory);
    
    // Store symptoms in session
    session.symptoms = symptoms;
    
    // Add analysis message
    const analysisMessage = {
      sender: 'bot',
      message: aiAnalysis,
      messageType: 'analysis',
      timestamp: new Date()
    };
    
    session.messages.push(analysisMessage);
    await session.save();
    
    // Create mock assessment structure for UI compatibility
    const mockAssessment = {
      possibleConditions: [
        {
          name: "General Health Guidance",
          urgency: symptoms.some(s => s.severity === 'Severe') ? "High" : "Medium",
          description: "Based on your symptoms, please see the detailed analysis above."
        }
      ],
      recommendations: [
        "Monitor your symptoms closely",
        "Stay hydrated and get adequate rest",
        "Consult a healthcare professional if symptoms persist or worsen"
      ],
      urgencyLevel: symptoms.some(s => s.severity === 'Severe') ? "High" : "Medium",
      shouldSeeDoctor: symptoms.some(s => s.severity === 'Severe')
    };
    
    res.json({
      success: true,
      data: {
        botMessage: analysisMessage,
        possibleConditions: mockAssessment.possibleConditions,
        assessment: mockAssessment
      }
    });
    
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze symptoms'
    });
  }
});

// GET /api/chatbot/session/:sessionId - Get chat session
router.get('/session/:sessionId', async (req, res) => {
  try {
    const session = await ChatSession.findOne({ sessionId: req.params.sessionId });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Chat session not found'
      });
    }
    
    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Session fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat session'
    });
  }
});

// DELETE /api/chatbot/session/:sessionId - Clear chat session
router.delete('/session/:sessionId', async (req, res) => {
  try {
    const session = await ChatSession.findOne({ sessionId: req.params.sessionId });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Chat session not found'
      });
    }
    
    // Clear messages but keep session
    session.messages = [{
      sender: 'bot',
      message: "Hello! I'm DocMate AI. How can I help you today?",
      messageType: 'text',
      timestamp: new Date()
    }];
    
    session.symptoms = [];
    session.assessment = null;
    
    await session.save();
    
    res.json({
      success: true,
      message: 'Chat session cleared successfully'
    });
  } catch (error) {
    console.error('Session clear error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear chat session'
    });
  }
});

module.exports = router;
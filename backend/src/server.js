import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { config, interviewPresets } from './config.js';
import { transcribeAudio, generateResponse, generateTTS } from './services/openai.js';
import { evaluateSession } from './services/evaluator.js';

const app = express();
app.use(cors());
// Increase payload limit to handle large audio base64 uploads
app.use(express.json({ limit: '50mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Get Preset Roles and Questions
app.get('/api/roles', (req, res) => {
  res.json(interviewPresets);
});

// REST Endpoint: Transcribe Audio
app.post('/api/transcribe', async (req, res) => {
  try {
    const { audio, apiKey } = req.body;
    if (!audio) {
      return res.status(400).json({ error: 'No audio data provided' });
    }
    
    // Decode base64 audio
    const audioBuffer = Buffer.from(audio, 'base64');
    const text = await transcribeAudio(audioBuffer, apiKey);
    
    res.json({ text });
  } catch (err) {
    console.error('Transcription error:', err);
    res.status(500).json({ error: err.message });
  }
});

// REST Endpoint: Generate Next Interviewer Response and Step Evaluation
app.post('/api/interview/next', async (req, res) => {
  try {
    const { role, seniority, history, apiKey } = req.body;
    
    if (!role || !seniority || !history) {
      return res.status(400).json({ error: 'Missing required fields: role, seniority, or history' });
    }

    const preset = interviewPresets[role];
    const targetKeywords = preset ? preset.keywords : [];

    // Call LLM orchestrator
    const result = await generateResponse(history, role, seniority, targetKeywords, apiKey);
    
    // Generate audio for the interviewer's voice
    let audioBase64 = '';
    try {
      audioBase64 = await generateTTS(result.interviewer_response, apiKey);
    } catch (ttsErr) {
      console.warn('TTS Generation failed, continuing without audio:', ttsErr.message);
    }

    res.json({
      interviewer_response: result.interviewer_response,
      evaluation: result.evaluation,
      audio: audioBase64
    });
  } catch (err) {
    console.error('Next question generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// REST Endpoint: Final Session Evaluation
app.post('/api/interview/evaluate', (req, res) => {
  try {
    const { history, role } = req.body;
    if (!history || !role) {
      return res.status(400).json({ error: 'Missing history or role' });
    }

    const preset = interviewPresets[role];
    const targetKeywords = preset ? preset.keywords : [];

    const summary = evaluateSession(history, targetKeywords);
    res.json(summary);
  } catch (err) {
    console.error('Session evaluation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create HTTP server & bind WebSockets
const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

// Attach WS to /ws/interview path
server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (url.pathname === '/ws/interview') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// WebSocket Connection Handler
wss.on('connection', (ws) => {
  console.log('New interview WS connection established');
  
  let session = {
    role: '',
    seniority: '',
    history: [], // Full history of messages for LLM context
    logs: [],    // Structured QA logs: { question, answer, duration, evaluation }
    targetKeywords: [],
    questionsList: [],
    currentQuestionIndex: 0,
    audioChunks: [],
    apiKey: ''
  };

  ws.on('message', async (data, isBinary) => {
    try {
      if (isBinary) {
        // Accumulate binary audio chunks
        session.audioChunks.push(Buffer.from(data));
        return;
      }

      // Handle JSON text packets
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'start_session': {
          session.role = message.role || 'frontend-dev';
          session.seniority = message.seniority || 'mid';
          session.apiKey = message.apiKey || '';
          
          const preset = interviewPresets[session.role];
          session.targetKeywords = preset ? preset.keywords : [];
          session.questionsList = preset ? preset.questions : [];
          session.currentQuestionIndex = 0;
          session.history = [];
          session.logs = [];

          // Generate initial greeting + first question
          const initialPrompt = [
            { role: 'user', content: 'Hello, I am ready for the interview.' }
          ];

          const response = await generateResponse(
            initialPrompt,
            session.role,
            session.seniority,
            session.targetKeywords,
            session.apiKey
          );

          session.history.push({ role: 'user', content: 'Hello, I am ready for the interview.' });
          session.history.push({ role: 'assistant', content: response.interviewer_response });

          // Generate TTS for the greeting
          let audioBase64 = '';
          try {
            audioBase64 = await generateTTS(response.interviewer_response, session.apiKey);
          } catch (e) {
            console.error('Greeting TTS failed:', e.message);
          }

          ws.send(JSON.stringify({
            type: 'interviewer_speech',
            text: response.interviewer_response,
            audio: audioBase64,
            isStart: true,
            question: response.interviewer_response
          }));
          break;
        }

        case 'submit_audio': {
          // Alternative to streaming: client sends the entire audio file base64 in one packet
          const duration = message.duration || 15;
          let text = '';
          
          if (message.audio) {
            const buffer = Buffer.from(message.audio, 'base64');
            text = await transcribeAudio(buffer, session.apiKey);
          } else if (session.audioChunks.length > 0) {
            const buffer = Buffer.concat(session.audioChunks);
            text = await transcribeAudio(buffer, session.apiKey);
          } else {
            text = 'No audio detected.';
          }

          // Clear audio buffer
          session.audioChunks = [];
          await processAnswer(text, duration);
          break;
        }

        case 'submit_text': {
          // For local/browser mode fallback or manual correction
          const text = message.text || '';
          const duration = message.duration || 15;
          await processAnswer(text, duration);
          break;
        }

        default:
          console.warn('Unknown WS message type:', message.type);
      }
    } catch (err) {
      console.error('WS Error:', err);
      ws.send(JSON.stringify({ type: 'error', message: err.message }));
    }
  });

  // Helper to process user answer and generate response
  async function processAnswer(userText, duration) {
    ws.send(JSON.stringify({ type: 'processing', status: 'thinking' }));

    const lastQuestion = session.history[session.history.length - 1]?.content || '';
    
    // Add user answer to history
    session.history.push({ role: 'user', content: userText });

    // Call LLM for next question and evaluation
    const result = await generateResponse(
      session.history,
      session.role,
      session.seniority,
      session.targetKeywords,
      session.apiKey
    );

    // Save QA logs
    session.logs.push({
      question: lastQuestion,
      answer: userText,
      duration: duration,
      evaluation: result.evaluation
    });

    // Check if we should continue
    const isFinished = session.currentQuestionIndex >= session.questionsList.length - 1;
    
    // Generate audio response
    let audioBase64 = '';
    try {
      audioBase64 = await generateTTS(result.interviewer_response, session.apiKey);
    } catch (e) {
      console.error('TTS Generation failed:', e.message);
    }

    // Add assistant reply to history
    session.history.push({ role: 'assistant', content: result.interviewer_response });

    if (isFinished) {
      // Calculate final dashboard evaluation
      const finalReport = evaluateSession(session.logs, session.targetKeywords);
      
      ws.send(JSON.stringify({
        type: 'interview_complete',
        text: result.interviewer_response,
        audio: audioBase64,
        evaluation: result.evaluation,
        summary: finalReport
      }));
    } else {
      session.currentQuestionIndex++;
      ws.send(JSON.stringify({
        type: 'interviewer_speech',
        text: result.interviewer_response,
        audio: audioBase64,
        evaluation: result.evaluation,
        isStart: false,
        question: result.interviewer_response
      }));
    }
  }

  ws.on('close', () => {
    console.log('Interview WS connection closed');
  });
});

// Start listening
server.listen(config.port, () => {
  console.log(`Mock Interviewer server running on http://localhost:${config.port}`);
});

import OpenAI, { toFile } from 'openai';
import { config } from '../config.js';

// Helper to get an OpenAI client instances
function getClient(clientKey) {
  const apiKey = clientKey || config.openaiApiKey;
  if (!apiKey) {
    throw new Error("OpenAI API key is missing. Please provide it in the settings or server env.");
  }
  return new OpenAI({ apiKey });
}

/**
 * Transcribes an audio buffer using OpenAI Whisper
 * @param {Buffer} audioBuffer - Raw audio data (WebM or WAV)
 * @param {string} clientKey - Optional client-supplied API key
 * @returns {Promise<string>} Transcribed text
 */
export async function transcribeAudio(audioBuffer, clientKey) {
  const openai = getClient(clientKey);
  
  // Convert buffer to file object for OpenAI API
  const file = await toFile(audioBuffer, 'recording.webm', { type: 'audio/webm' });
  
  const transcription = await openai.audio.transcriptions.create({
    file: file,
    model: 'whisper-1',
  });
  
  return transcription.text;
}

/**
 * Generates the interviewer's reply and evaluates the user's answer
 * @param {Array} messages - Chat history list
 * @param {string} role - Target role (e.g. 'frontend-dev')
 * @param {string} seniority - Seniority level ('junior', 'mid', 'senior')
 * @param {Array<string>} targetKeywords - Presets keywords list
 * @param {string} clientKey - Optional client-supplied API key
 */
export async function generateResponse(messages, role, seniority, targetKeywords = [], clientKey) {
  const openai = getClient(clientKey);
  
  const systemPrompt = `You are a professional, empathetic, yet rigorous technical interviewer conducting a mock interview.
Target Role: ${role}
Seniority Level: ${seniority}
List of Target Keywords: ${targetKeywords.join(', ')}

Your task is to conduct the interview naturally. For every user response:
1. Assess their answer. Look for technical accuracy, filler words, tone, and keyword usage.
2. Formulate a natural follow-up question or transition to the next topic. Keep your response brief, engaging, and professional (under 3 sentences, like a real speaking interviewer).
3. If this is the start of the session (e.g., the user greeted you or history is empty), introduce yourself warmly, state the role, and ask your first question.

You MUST reply strictly in JSON format matching this schema:
{
  "interviewer_response": "The next question, follow-up, or greeting/wrap-up statement. (Keep it spoken-friendly, conversational, and under 3-4 sentences)",
  "evaluation": {
    "accuracy_score": 85, // Integer 0-100 evaluating the user's previous answer. If it's a greeting/start, use 100.
    "feedback": "Constructive feedback on their previous answer. What went well, what was missing? If greeting, say 'Let's begin.'",
    "tone_assessment": "Confident / Professional / Hesitant / Energetic", // Evaluate the communication style of their response.
    "technical_keywords_found": ["keyword1", "keyword2"], // Array of strings of the target keywords they actually hit.
    "filler_words_detected": ["um", "like", "you know"] // List filler words you noticed in their speech transcription.
  }
}

Be encouraging but give honest, realistic scores. Do not mention the JSON structure in your interviewer_response.`;

  const chatMessages = [
    { role: 'system', content: systemPrompt },
    ...messages
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: chatMessages,
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const content = response.choices[0].message.content;
  return JSON.parse(content);
}

/**
 * Generates TTS voice audio from text
 * @param {string} text - Text to synthesize
 * @param {string} clientKey - Optional client-supplied API key
 * @returns {Promise<string>} Base64 encoded MP3 audio
 */
export async function generateTTS(text, clientKey) {
  const openai = getClient(clientKey);
  
  const mp3 = await openai.audio.speech.create({
    model: 'tts-1',
    voice: 'alloy', // natural neutral voice
    input: text,
  });
  
  const buffer = Buffer.from(await mp3.arrayBuffer());
  return buffer.toString('base64');
}

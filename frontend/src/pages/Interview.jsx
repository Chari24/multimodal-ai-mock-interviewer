import React, { useState, useEffect, useRef } from 'react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { interviewPresets } from '../config';
import { Mic, MicOff, Video, VideoOff, Square, Sparkles, AlertCircle, RefreshCw, Volume2 } from 'lucide-react';

export function Interview({ settings, onComplete, onExit }) {
  // States: 'initializing' | 'speaking' | 'listening' | 'thinking'
  const [status, setStatus] = useState('initializing');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [logs, setLogs] = useState([]);
  const [history, setHistory] = useState([]);
  
  const [currentQuestionText, setCurrentQuestionText] = useState('Initializing interview session...');
  const [cameraActive, setCameraActive] = useState(true);
  const [transcriptTicker, setTranscriptTicker] = useState('');

  const { isRecording, recordingDuration, startRecording, stopRecording, analyser } = useAudioRecorder();
  const { isListening, transcript, hasBrowserSupport, startListening, stopListening, resetTranscript } = useSpeechRecognition();

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const audioPlayerRef = useRef(new Audio());
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const statusRef = useRef('initializing');

  // Sync state ref for high performance drawing callback
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Load Preset
  const preset = interviewPresets[settings.role];
  const questionsList = preset ? preset.questions.slice(0, settings.questionCount) : [];
  const targetKeywords = preset ? preset.keywords : [];

  // 1. Initialize Camera Feed and first question
  useEffect(() => {
    startCamera();
    startSession();

    return () => {
      stopCamera();
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.src = '';
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Web Speech API browser synthesiser end event listener
  useEffect(() => {
    if (settings.mode === 'local') {
      // Periodic check for speech synthesis completion
      const checkSpeech = setInterval(() => {
        if (statusRef.current === 'speaking' && window.speechSynthesis && !window.speechSynthesis.speaking) {
          handleInterviewerSpeechEnd();
        }
      }, 500);
      return () => clearInterval(checkSpeech);
    } else {
      const handleAudioEnd = () => {
        handleInterviewerSpeechEnd();
      };
      const player = audioPlayerRef.current;
      player.addEventListener('ended', handleAudioEnd);
      return () => {
        player.removeEventListener('ended', handleAudioEnd);
      };
    }
  }, [settings.mode, currentQuestionIndex]);

  // Canvas visualizer loop
  useEffect(() => {
    if (canvasRef.current) {
      drawVisualizer();
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, status]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      console.warn("Camera preview failed to load:", err.message);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const toggleCamera = () => {
    if (cameraActive) {
      stopCamera();
      setCameraActive(false);
    } else {
      startCamera();
    }
  };

  // 2. Start Session Logic
  const startSession = async () => {
    setStatus('initializing');
    const firstQuestion = questionsList[0];

    if (settings.mode === 'cloud') {
      try {
        const response = await fetch('http://localhost:5000/api/interview/next', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: settings.role,
            seniority: settings.seniority,
            apiKey: settings.apiKey,
            history: [{ role: 'user', content: 'Hello, I am ready to start the interview.' }]
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Server error initializing session');
        }

        const data = await response.json();
        setCurrentQuestionText(data.interviewer_response);
        setHistory([
          { role: 'user', content: 'Hello, I am ready to start the interview.' },
          { role: 'assistant', content: data.interviewer_response }
        ]);

        // Play audio
        if (data.audio) {
          playCloudAudio(data.audio);
        } else {
          speakLocalText(data.interviewer_response);
        }
      } catch (err) {
        console.error('Cloud init failed, falling back to local presets:', err);
        settings.mode = 'local'; // switch to local
        triggerLocalFirstQuestion(firstQuestion);
      }
    } else {
      triggerLocalFirstQuestion(firstQuestion);
    }
  };

  const triggerLocalFirstQuestion = (firstQuestion) => {
    const greeting = `Hello! Welcome to your mock interview for the ${settings.seniority} ${preset.title} position. Let's begin. Here is your first question: ${firstQuestion}`;
    setCurrentQuestionText(greeting);
    setHistory([
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: greeting }
    ]);
    speakLocalText(greeting);
  };

  // 3. Playback Controls
  const playCloudAudio = (base64Audio) => {
    setStatus('speaking');
    audioPlayerRef.current.src = `data:audio/mp3;base64,${base64Audio}`;
    audioPlayerRef.current.play().catch(e => {
      console.warn("Audio autoplay blocked by browser, falling back to synthesiser", e);
      speakLocalText(currentQuestionText);
    });
  };

  const speakLocalText = (text) => {
    setStatus('speaking');
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      // Use standard voice
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(v => v.lang.includes('en-US')) || voices[0];
      if (englishVoice) utterance.voice = englishVoice;
      
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    } else {
      // browser doesn't support synthesis, end speech immediately
      setTimeout(handleInterviewerSpeechEnd, 1000);
    }
  };

  const handleInterviewerSpeechEnd = () => {
    setStatus('listening');
    setTranscriptTicker('');
    
    // Automatically trigger mic recording
    startMicRecording();
  };

  const startMicRecording = async () => {
    try {
      await startRecording();
      if (settings.mode === 'local' && hasBrowserSupport) {
        startListening();
      }
    } catch (e) {
      console.error("Failed to start recording:", e);
    }
  };

  // 4. Submit Answer
  const handleStopRecording = async () => {
    setStatus('thinking');
    if (settings.mode === 'local' && hasBrowserSupport) {
      stopListening();
    }

    try {
      const { blob, duration } = await stopRecording();
      
      let answerText = '';

      if (settings.mode === 'cloud') {
        // Read file as base64 and upload to Whisper transcription API
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        await new Promise((resolve) => {
          reader.onloadend = () => {
            const base64Data = reader.result.split(',')[1];
            resolve(base64Data);
          };
        }).then(async (base64Audio) => {
          const res = await fetch('http://localhost:5000/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audio: base64Audio, apiKey: settings.apiKey })
          });
          const textData = await res.json();
          answerText = textData.text || '';
        }).catch(err => {
          console.error('Whisper transcription failed, falling back to local speech:', err);
          answerText = transcript || 'No answer recorded due to audio transcription error.';
        });
      } else {
        answerText = transcript || 'No answer recorded.';
      }

      await processAnswer(answerText, duration);

    } catch (err) {
      console.error('Error stopping recording:', err);
      setStatus('listening');
    }
  };

  const processAnswer = async (answerText, duration) => {
    const nextIndex = currentQuestionIndex + 1;
    const isFinished = nextIndex >= questionsList.length;

    // Append to logs
    const currentQuestion = questionsList[currentQuestionIndex];
    let stepEvaluation = null;
    let nextInterviewerSpeech = '';
    let audioBase64 = '';

    if (settings.mode === 'cloud') {
      try {
        const nextHistory = [
          ...history,
          { role: 'user', content: answerText }
        ];

        const response = await fetch('http://localhost:5000/api/interview/next', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: settings.role,
            seniority: settings.seniority,
            apiKey: settings.apiKey,
            history: nextHistory
          })
        });

        const data = await response.json();
        stepEvaluation = data.evaluation;
        nextInterviewerSpeech = data.interviewer_response;
        audioBase64 = data.audio;

        setHistory([
          ...nextHistory,
          { role: 'assistant', content: nextInterviewerSpeech }
        ]);

      } catch (err) {
        console.error('Cloud response generation failed, executing local rules:', err);
        // Fallback to local evaluation rules if server is down
        const fallback = generateLocalEvaluation(answerText, currentQuestion);
        stepEvaluation = fallback.evaluation;
        nextInterviewerSpeech = isFinished ? "Thank you, that concludes our mock interview." : fallback.nextQuestion;
      }
    } else {
      // Local preset evaluation engine
      const evalData = generateLocalEvaluation(answerText, currentQuestion);
      stepEvaluation = evalData.evaluation;
      nextInterviewerSpeech = isFinished ? "Thank you for your time. That completes the mock interview. Let's see your results." : evalData.nextQuestion;
      
      setHistory([
        ...history,
        { role: 'user', content: answerText },
        { role: 'assistant', content: nextInterviewerSpeech }
      ]);
    }

    const updatedLogs = [
      ...logs,
      {
        question: currentQuestion,
        answer: answerText,
        duration: duration,
        evaluation: stepEvaluation
      }
    ];
    setLogs(updatedLogs);

    if (isFinished) {
      // Fetch aggregate session summary
      setStatus('thinking');
      if (settings.mode === 'cloud') {
        try {
          const evalRes = await fetch('http://localhost:5000/api/interview/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ history: updatedLogs, role: settings.role })
          });
          const summaryReport = await evalRes.json();
          onComplete(summaryReport);
        } catch (err) {
          console.error('Cloud final evaluation failed, running local evaluation aggregates:', err);
          runLocalSessionAggregation(updatedLogs);
        }
      } else {
        runLocalSessionAggregation(updatedLogs);
      }
    } else {
      setCurrentQuestionIndex(nextIndex);
      setCurrentQuestionText(nextInterviewerSpeech);

      // Play next question
      if (audioBase64) {
        playCloudAudio(audioBase64);
      } else {
        speakLocalText(nextInterviewerSpeech);
      }
    }
  };

  // Local Evaluator Helper (Zero-key fallback)
  const generateLocalEvaluation = (answerText, currentQuestion) => {
    const textLower = answerText.toLowerCase();
    
    // 1. Check Keywords
    const foundKeywords = targetKeywords.filter(kw => textLower.includes(kw.toLowerCase()));

    // 2. Check Filler Words
    const fillers = ["um", "uh", "like", "you know", "basically", "actually"];
    const foundFillers = [];
    fillers.forEach(w => {
      const regex = new RegExp(`\\b${w}\\b`, 'gi');
      if (textLower.match(regex)) {
        foundFillers.push(w);
      }
    });

    // 3. Grade Score (Rough heuristic: length + keywords)
    let score = 55; // baseline
    score += foundKeywords.length * 8;
    if (answerText.split(' ').length > 40) score += 15;
    if (answerText.split(' ').length < 10) score -= 15;
    score = Math.max(45, Math.min(95, score));

    // 4. Tone
    let tone = 'Professional';
    if (foundFillers.length > 3) tone = 'Hesitant';
    if (answerText.split(' ').length < 15) tone = 'Brief';

    // 5. Next question
    const nextQuestion = questionsList[currentQuestionIndex + 1] || 'No more questions.';

    return {
      nextQuestion,
      evaluation: {
        accuracy_score: score,
        feedback: `Local Evaluation: You covered key terms like: ${foundKeywords.join(', ') || 'none'}. Your explanation had a word count of ${answerText.split(' ').length} words.`,
        tone_assessment: tone,
        technical_keywords_found: foundKeywords,
        filler_words_detected: foundFillers
      }
    };
  };

  const runLocalSessionAggregation = async (allLogs) => {
    try {
      const response = await fetch('http://localhost:5000/api/interview/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: allLogs, role: settings.role })
      });
      const summaryReport = await response.json();
      onComplete(summaryReport);
    } catch (e) {
      console.warn("Backend unavailable, executing direct frontend aggregate calculation:", e.message);
      // Hard fallback calculation completely inside React
      const validAnswers = allLogs.filter(l => l.answer && l.answer.trim().length > 0);
      let avgAccuracy = 75;
      if (validAnswers.length > 0) {
        const sum = validAnswers.reduce((acc, curr) => acc + (curr.evaluation?.accuracy_score || 70), 0);
        avgAccuracy = Math.round(sum / validAnswers.length);
      }
      
      const keywordsHit = Array.from(new Set(validAnswers.flatMap(l => l.evaluation?.technical_keywords_found || [])));
      const keywordsMissed = targetKeywords.filter(k => !keywordsHit.includes(k));
      const keywordCoverage = targetKeywords.length > 0 ? Math.round((keywordsHit.length / targetKeywords.length) * 100) : 0;
      
      const fillerWordCount = validAnswers.reduce((acc, curr) => acc + (curr.evaluation?.filler_words_detected?.length || 0), 0);
      
      onComplete({
        overallScore: Math.round((avgAccuracy * 0.7) + (keywordCoverage * 0.3)),
        accuracyScore: avgAccuracy,
        communicationScore: Math.max(50, 100 - (fillerWordCount * 5)),
        fillerWordCount,
        fillerWordAnalysis: {},
        averageWpm: 125,
        pacingStatus: 'Ideal (125 WPM)',
        keywordCoverage,
        keywordsHit,
        keywordsMissed,
        questionBreakdown: allLogs.map((l, i) => ({
          questionNumber: i + 1,
          question: l.question,
          answer: l.answer,
          duration: l.duration,
          wpm: 125,
          pacing: 'Ideal',
          accuracyScore: l.evaluation?.accuracy_score || 70,
          feedback: l.evaluation?.feedback || 'Local feedback completed.',
          tone: l.evaluation?.tone_assessment || 'Confident',
          keywordsFound: l.evaluation?.technical_keywords_found || []
        })),
        generalFeedback: "Offline Evaluation Complete. You completed all questions locally. Make sure the Node server is running to unlock detailed charts, high-accuracy AI Whisper and GPT-4o-mini grading."
      });
    }
  };

  // Sync transcription live preview ticker
  useEffect(() => {
    if (isListening && transcript) {
      setTranscriptTicker(transcript);
    }
  }, [isListening, transcript]);

  // 5. Canvas Drawing Algorithm
  const drawVisualizer = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = canvas.offsetHeight;
    
    let time = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      
      const currentStatus = statusRef.current;

      if (currentStatus === 'listening' && analyser) {
        // Real-time microphone visualizer
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        const barWidth = (width / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * height * 0.8;

          // Gradient color depending on height
          const grad = ctx.createLinearGradient(0, height, 0, height - barHeight);
          grad.addColorStop(0, '#6366f1');  // Primary Indigo
          grad.addColorStop(1, '#ec4899');  // Accent Pink

          ctx.fillStyle = grad;
          ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight);

          x += barWidth;
        }
      } else if (currentStatus === 'speaking') {
        // Pulsing interviewer voice waves
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#a855f7'; // Secondary Purple

        time += 0.08;

        for (let x = 0; x < width; x++) {
          // Combination of sine waves to simulate speech harmonics
          const y = height / 2 + 
            Math.sin(x * 0.025 + time) * 15 * Math.sin(time * 0.3) +
            Math.cos(x * 0.05 - time * 0.5) * 5;
          
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();

        // Secondary subtle wave
        ctx.beginPath();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(236, 72, 153, 0.4)'; // Pink Accent
        for (let x = 0; x < width; x++) {
          const y = height / 2 + 
            Math.sin(x * 0.015 - time * 0.7) * 8 * Math.cos(time * 0.2);
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      } else if (currentStatus === 'thinking') {
        // Slow particle flowing waves (representing processing)
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#06b6d4'; // Cyan Info

        time += 0.02;

        for (let x = 0; x < width; x++) {
          const y = height / 2 + Math.sin(x * 0.01 + time) * 8;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      } else {
        // Idle flat line
        ctx.beginPath();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();
  };

  return (
    <div className="interview-layout">
      {/* Left panel: Camera video feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="video-container" style={{ flex: 1, minHeight: '340px' }}>
          {cameraActive ? (
            <video ref={videoRef} className="video-feed" autoPlay playsInline muted />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              <VideoOff size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <p>Camera feed disabled</p>
            </div>
          )}
          
          <div className="video-overlay">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="badge badge-primary" style={{ padding: '0.25rem 0.5rem', background: 'rgba(239, 68, 68, 0.25)', borderColor: 'var(--danger)', color: 'white' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--danger)', display: 'inline-block', marginRight: '4px', animation: 'pulse-ring 1.5s infinite' }}></span>
                LIVE FEED
              </span>
            </div>
            <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={toggleCamera}>
              {cameraActive ? 'Turn Camera Off' : 'Turn Camera On'}
            </button>
          </div>
        </div>

        {/* User live text subtitle ticker */}
        <div className="subtitle-container">
          {status === 'listening' ? (
            <div>
              <span style={{ color: 'var(--accent)', fontWeight: 700, display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                🔴 Recording Speech (Speaking duration: {recordingDuration}s)
              </span>
              <p style={{ fontStyle: 'italic' }}>
                {transcriptTicker || 'Speak now... (Press "Submit Answer" when finished)'}
              </p>
            </div>
          ) : status === 'speaking' ? (
            <div>
              <span style={{ color: 'var(--secondary)', fontWeight: 700, display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                🔊 Interviewer speaking
              </span>
              <p>{currentQuestionText}</p>
            </div>
          ) : status === 'thinking' ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
              <RefreshCw className="animate-spin" size={18} color="var(--primary)" />
              <span>Analyzing response and creating evaluation details...</span>
            </div>
          ) : (
            <span>Connecting resources...</span>
          )}
        </div>
      </div>

      {/* Right panel: AI Interviewer Avatar and Controls */}
      <div className="glass-panel interviewer-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem' }}>AI Technical Interviewer</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Question {currentQuestionIndex + 1} of {questionsList.length} • {preset.title} ({settings.seniority})
            </p>
          </div>
          <span className="badge badge-primary">
            {settings.mode === 'cloud' ? 'Cloud AI' : 'Browser Engine'}
          </span>
        </div>

        <div className="avatar-container">
          <div className={`avatar-circle ${status === 'speaking' ? 'speaking' : ''}`}>
            <div className="avatar-pulsar"></div>
            <div className="avatar-image">🤖</div>
          </div>
          
          {/* Visualizer Waves */}
          <canvas ref={canvasRef} style={{ width: '100%', height: '70px', borderRadius: '8px' }} />
        </div>

        {/* Dynamic Toolbar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
          {status === 'listening' ? (
            <button className="btn btn-danger pulse-recording" style={{ padding: '1rem' }} onClick={handleStopRecording}>
              <Square size={18} fill="white" /> Submit Answer
            </button>
          ) : status === 'speaking' ? (
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                className="btn btn-secondary" 
                style={{ flex: 1 }} 
                onClick={() => settings.mode === 'cloud' ? speakLocalText(currentQuestionText) : speakLocalText(currentQuestionText)}
              >
                <Volume2 size={16} /> Replay Question
              </button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1 }}
                onClick={handleInterviewerSpeechEnd}
              >
                Skip to Speaking
              </button>
            </div>
          ) : (
            <button className="btn btn-secondary" style={{ pointerEvents: 'none', opacity: 0.6 }}>
              Processing...
            </button>
          )}

          <button 
            className="btn btn-secondary" 
            style={{ fontSize: '0.85rem', padding: '0.5rem', marginTop: '0.5rem' }} 
            onClick={onExit}
          >
            Cancel Interview
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Briefcase, Key, Play, Video, VideoOff, Settings, Sparkles, Cpu, Globe } from 'lucide-react';

const ROLES = [
  { id: 'frontend-dev', title: 'Frontend Developer', desc: 'Focuses on React, UI/UX performance, responsive designs, CSS, and modern web APIs.', icon: '⚛️' },
  { id: 'backend-dev', title: 'Backend Developer', desc: 'Focuses on API architectures, SQL/NoSQL databases, distributed caching, security, and concurrency.', icon: '💻' },
  { id: 'data-scientist', title: 'Data Scientist', desc: 'Focuses on machine learning models, statistical distributions, pre-processing, precision vs recall, and algorithms.', icon: '📊' },
  { id: 'product-manager', title: 'Product Manager', desc: 'Focuses on feature prioritization models (RICE), release roadmap alignments, KPIs, and user engagement metrics.', icon: '📋' }
];

export function Setup({ onStart, settings, setSettings }) {
  const [selectedRole, setSelectedRole] = useState(settings.role || 'frontend-dev');
  const [seniority, setSeniority] = useState(settings.seniority || 'mid');
  const [questionCount, setQuestionCount] = useState(settings.questionCount || 3);
  const [mode, setMode] = useState(settings.mode || 'local'); // 'local' (browser API) vs 'cloud' (OpenAI server)
  const [apiKey, setApiKey] = useState(localStorage.getItem('openai_api_key') || '');
  
  const [cameraActive, setCameraActive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Stop camera stream when component unmounts
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      alert("Could not access camera/mic: " + err.message);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const toggleCamera = () => {
    if (cameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  const handleStart = () => {
    if (mode === 'cloud' && !apiKey) {
      alert("Please provide an OpenAI API key or switch to Browser Native mode.");
      setShowSettings(true);
      return;
    }
    
    if (mode === 'cloud') {
      localStorage.setItem('openai_api_key', apiKey);
    }

    stopCamera();
    onStart({
      role: selectedRole,
      seniority,
      questionCount,
      mode,
      apiKey: mode === 'cloud' ? apiKey : ''
    });
  };

  return (
    <div className="setup-container">
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 className="gradient-text glow-text" style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>
          Multimodal AI Interviewer
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.15rem', maxWidth: '600px', margin: '0 auto' }}>
          Simulate a real-time technical video interview. Practice speaking and receive immediate grading, filler word analytics, and technical keyword coverage.
        </p>
      </div>

      <div className="setup-grid">
        {/* Left Side: Role Selector and Configuration */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={20} color="var(--secondary)" /> 1. Select Target Role
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
            {ROLES.map(role => (
              <div 
                key={role.id}
                className={`glass-card ${selectedRole === role.id ? 'active-card' : ''}`}
                style={{ 
                  cursor: 'pointer',
                  borderWidth: '1px',
                  borderColor: selectedRole === role.id ? 'var(--primary)' : 'var(--border-color)',
                  boxShadow: selectedRole === role.id ? 'var(--shadow-glow)' : 'none',
                  background: selectedRole === role.id ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-glass)'
                }}
                onClick={() => setSelectedRole(role.id)}
              >
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{role.icon}</div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{role.title}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{role.desc}</p>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: '1.4rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cpu size={20} color="var(--primary)" /> 2. Interview Configuration
          </h2>

          {/* Seniority */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Seniority Level</label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {['junior', 'mid', 'senior'].map(level => (
                <button
                  key={level}
                  className="btn"
                  style={{
                    flex: 1,
                    textTransform: 'capitalize',
                    background: seniority === level ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                    border: '1px solid',
                    borderColor: seniority === level ? 'var(--primary)' : 'var(--border-color)',
                    color: seniority === level ? 'white' : 'var(--text-secondary)'
                  }}
                  onClick={() => setSeniority(level)}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Question Count */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Questions Count: <span style={{ color: 'var(--primary)' }}>{questionCount}</span>
            </label>
            <input 
              type="range" 
              min="1" 
              max="4" 
              value={questionCount} 
              onChange={(e) => setQuestionCount(parseInt(e.target.value))}
              style={{
                width: '100%',
                accentColor: 'var(--primary)',
                background: 'rgba(255,255,255,0.1)',
                height: '6px',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              <span>1 Question</span>
              <span>2 Questions</span>
              <span>3 Questions</span>
              <span>4 Questions</span>
            </div>
          </div>

          {/* Mode Toggle */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Execution Engine</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div 
                className="glass-card" 
                style={{ 
                  flex: 1, 
                  cursor: 'pointer',
                  borderColor: mode === 'local' ? 'var(--success)' : 'var(--border-color)',
                  background: mode === 'local' ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-glass)'
                }}
                onClick={() => setMode('local')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: mode === 'local' ? 'var(--success)' : 'var(--text-primary)' }}>
                  <Globe size={18} />
                  <span style={{ fontWeight: 700 }}>Browser Native</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.3' }}>
                  Free. Runs directly in browser. Uses Web Speech API for speech-to-text and text-to-speech. No API keys required.
                </p>
              </div>

              <div 
                className="glass-card" 
                style={{ 
                  flex: 1, 
                  cursor: 'pointer',
                  borderColor: mode === 'cloud' ? 'var(--secondary)' : 'var(--border-color)',
                  background: mode === 'cloud' ? 'rgba(168, 85, 247, 0.08)' : 'var(--bg-glass)'
                }}
                onClick={() => setMode('cloud')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: mode === 'cloud' ? 'var(--secondary)' : 'var(--text-primary)' }}>
                  <Key size={18} />
                  <span style={{ fontWeight: 700 }}>Cloud AI API</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.3' }}>
                  High Quality. Uses Whisper for transcription, GPT-4o-mini for questions/rubrics, and OpenAI TTS for human voice response.
                </p>
              </div>
            </div>
          </div>

          {/* API Key Drawer */}
          {mode === 'cloud' && (
            <div className="glass-card animate-fade-in" style={{ borderColor: 'rgba(168, 85, 247, 0.3)', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Key size={16} /> OpenAI API Key
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Saved locally in browser</span>
              </div>
              <input 
                type="password" 
                className="input-field" 
                placeholder="sk-..." 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Right Side: Camera Test & Start */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '300px' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Video size={18} color="var(--primary)" /> Device Checklist
            </h2>

            <div className="video-container" style={{ width: '100%', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#090a0f' }}>
              {cameraActive ? (
                <video ref={videoRef} className="video-feed" autoPlay playsInline muted />
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  <VideoOff size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                  <p style={{ fontSize: '0.9rem' }}>Camera preview is inactive</p>
                </div>
              )}
            </div>

            <button 
              className="btn btn-secondary" 
              style={{ width: '100%', marginBottom: '1rem' }} 
              onClick={toggleCamera}
            >
              {cameraActive ? 'Disable Camera Preview' : 'Enable Camera & Mic'}
            </button>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Authorize browser microphone and camera access to begin. Your camera feed is processed entirely locally.
            </p>
          </div>

          <button 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '1.25rem', fontSize: '1.2rem' }}
            onClick={handleStart}
          >
            <Play size={20} fill="currentColor" /> Start Interview Session
          </button>
        </div>
      </div>
    </div>
  );
}

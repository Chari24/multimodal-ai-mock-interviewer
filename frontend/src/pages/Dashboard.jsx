import React, { useState } from 'react';
import { Award, MessageSquare, AlertTriangle, Compass, CheckCircle2, ChevronDown, ChevronUp, RefreshCw, Volume2 } from 'lucide-react';

export function Dashboard({ summary, onRestart }) {
  const [expandedQuestion, setExpandedQuestion] = useState(0);

  const {
    overallScore = 0,
    accuracyScore = 0,
    communicationScore = 0,
    fillerWordCount = 0,
    fillerWordAnalysis = {},
    averageWpm = 0,
    pacingStatus = 'Ideal',
    keywordCoverage = 0,
    keywordsHit = [],
    keywordsMissed = [],
    questionBreakdown = [],
    generalFeedback = ''
  } = summary;

  // Gauge helper component
  const CircularGauge = ({ score, label, color1, color2 }) => {
    const radius = 35;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
      <div className="glass-card metric-card" style={{ flex: 1 }}>
        <div className="progress-ring-container">
          <svg style={{ transform: 'rotate(-90deg)', width: '90px', height: '90px' }}>
            <circle
              cx="45"
              cy="45"
              r={radius}
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth="6"
              fill="transparent"
            />
            <circle
              cx="45"
              cy="45"
              r={radius}
              stroke={`url(#grad-${label.replace(/\s+/g, '')})`}
              strokeWidth="6"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
            />
            <defs>
              <linearGradient id={`grad-${label.replace(/\s+/g, '')}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={color1} />
                <stop offset="100%" stopColor={color2} />
              </linearGradient>
            </defs>
          </svg>
          <span className="progress-ring-text" style={{ color: color1 }}>{score}</span>
        </div>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>{label}</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Score Weight</p>
        </div>
      </div>
    );
  };

  const toggleExpand = (index) => {
    setExpandedQuestion(expandedQuestion === index ? -1 : index);
  };

  return (
    <div className="dashboard-container" style={{ animation: 'fade-in 0.5s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <span className="badge badge-primary" style={{ marginBottom: '0.5rem' }}>Session Report</span>
          <h1 className="gradient-text glow-text" style={{ fontSize: '2.5rem' }}>Performance Review</h1>
        </div>
        <button className="btn btn-primary" onClick={onRestart}>
          <RefreshCw size={18} /> New Mock Interview
        </button>
      </div>

      {/* 3 Circular Gauges */}
      <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
        <CircularGauge score={overallScore} label="Overall Score" color1="#6366f1" color2="#a855f7" />
        <CircularGauge score={accuracyScore} label="Technical Accuracy" color1="#10b981" color2="#059669" />
        <CircularGauge score={communicationScore} label="Communication Clarity" color1="#ec4899" color2="#f43f5e" />
      </div>

      {/* Main Breakdown Area */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem', marginBottom: '2rem' }}>
        {/* Left Side: General Feedback & Question logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award size={20} color="var(--primary)" /> Evaluator Summary
            </h2>
            <p style={{ lineHeight: '1.6', color: 'var(--text-primary)', fontSize: '1.05rem' }}>
              {generalFeedback}
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={20} color="var(--secondary)" /> Question-by-Question breakdown
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {questionBreakdown.map((item, idx) => (
                <div 
                  key={idx} 
                  className="glass-card" 
                  style={{ 
                    padding: '0', 
                    overflow: 'hidden',
                    borderColor: expandedQuestion === idx ? 'var(--primary)' : 'var(--border-color)' 
                  }}
                >
                  {/* Card Header */}
                  <div 
                    style={{ 
                      padding: '1.25rem', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      cursor: 'pointer',
                      background: expandedQuestion === idx ? 'rgba(255,255,255,0.02)' : 'transparent'
                    }}
                    onClick={() => toggleExpand(idx)}
                  >
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                        QUESTION {item.questionNumber}
                      </span>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', paddingRight: '1rem' }}>
                        {item.question}
                      </h4>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span className="badge badge-primary" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                        {item.accuracyScore}%
                      </span>
                      {expandedQuestion === idx ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>

                  {/* Card Expanded Content */}
                  {expandedQuestion === idx && (
                    <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border-color)', background: 'rgba(10, 11, 16, 0.3)' }}>
                      <div style={{ marginBottom: '1.25rem' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 700, display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                          Your Response:
                        </span>
                        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: '1.5', background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid var(--accent)' }}>
                          "{item.answer}"
                        </p>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                        <div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>SPEECH PACE</span>
                          <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{item.wpm} WPM ({item.pacing})</span>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>COMMUNICATION TONE</span>
                          <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--secondary)' }}>{item.tone}</span>
                        </div>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700, display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                          AI Grading Feedback:
                        </span>
                        <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                          {item.feedback}
                        </p>
                      </div>

                      {item.keywordsFound.length > 0 && (
                        <div style={{ marginTop: '1rem' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>KEYWORDS HIT</span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                            {item.keywordsFound.map((kw, kIdx) => (
                              <span key={kIdx} className="badge badge-success" style={{ fontSize: '0.75rem' }}>{kw}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Specific metrics, WPM, Keywords, Fillers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Keywords Covered */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Compass size={20} color="var(--primary)" /> Keyword Coverage
            </h2>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', margin: '0.75rem 0' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>{keywordCoverage}%</span>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>target coverage reached</span>
            </div>
            
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600, margin: '1rem 0 0.5rem 0' }}>Hit</h3>
            <div className="keywords-badge-grid">
              {keywordsHit.length > 0 ? (
                keywordsHit.map((kw, idx) => (
                  <span key={idx} className="badge badge-success">
                    <CheckCircle2 size={12} /> {kw}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>None matched</span>
              )}
            </div>

            {keywordsMissed.length > 0 && (
              <>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600, margin: '1.25rem 0 0.5rem 0' }}>Missed Coverage Options</h3>
                <div className="keywords-badge-grid">
                  {keywordsMissed.map((kw, idx) => (
                    <span key={idx} className="badge badge-danger">
                      {kw}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Filler Word Tracker */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={20} color="var(--accent)" /> Filler Word Usage
            </h2>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', margin: '0.75rem 0' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent)' }}>{fillerWordCount}</span>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>filler words detected</span>
            </div>

            {/* Custom CSS Bar Chart for Fillers */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
              {Object.keys(fillerWordAnalysis).length > 0 ? (
                Object.entries(fillerWordAnalysis).map(([word, val]) => {
                  // Percentage of total fillers
                  const pct = fillerWordCount > 0 ? (val / fillerWordCount) * 100 : 0;
                  return (
                    <div key={word} style={{ fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>"{word}"</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{val} times</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div 
                          style={{ 
                            width: `${pct}%`, 
                            height: '100%', 
                            background: 'linear-gradient(to right, var(--accent), var(--secondary))', 
                            borderRadius: '4px' 
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="badge badge-success" style={{ width: '100%', justifyContent: 'center', padding: '0.5rem' }}>
                  🏆 Perfect communication! No filler words detected.
                </div>
              )}
            </div>
          </div>

          {/* Pacing Speedometer */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Compass size={20} color="var(--info)" /> Speech Velocity
            </h2>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', margin: '0.75rem 0' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--info)' }}>{averageWpm}</span>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>average WPM</span>
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--info)', marginBottom: '0.5rem' }}>
              Pacing Status: {pacingStatus}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              An ideal interview speaking rate is between 110 and 150 words per minute. This allows you to explain complex topics calmly while keeping the listener engaged.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Setup } from './pages/Setup';
import { Interview } from './pages/Interview';
import { Dashboard } from './pages/Dashboard';
import { Sparkles } from 'lucide-react';

export default function App() {
  const [page, setPage] = useState('setup');
  const [settings, setSettings] = useState({
    role: 'frontend-dev',
    seniority: 'mid',
    questionCount: 3,
    mode: 'local',
    apiKey: ''
  });
  const [summary, setSummary] = useState(null);

  const handleStartInterview = (newSettings) => {
    setSettings(newSettings);
    setPage('interview');
  };

  const handleInterviewComplete = (evaluationSummary) => {
    setSummary(evaluationSummary);
    setPage('dashboard');
  };

  const handleExitInterview = () => {
    if (window.confirm("Are you sure you want to end this interview? Your progress will not be saved.")) {
      setPage('setup');
    }
  };

  const handleRestart = () => {
    setSummary(null);
    setPage('setup');
  };

  return (
    <div className="app-container">
      {/* Universal Header */}
      <header className="app-header">
        <div className="logo">
          <div className="logo-icon">
            <Sparkles size={18} fill="white" />
          </div>
          <span>ANTIGRAVITY <span style={{ color: 'var(--primary)', fontWeight: 800 }}>TALENT</span></span>
        </div>
        
        <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <a 
            href="https://github.com/Chari24?tab=projects" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.35rem', margin: 0 }}
          >
            <span>📁 GitHub Projects</span>
          </a>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            Mock Session Simulator v1.0.0
          </span>
        </div>
      </header>

      {/* Main Screen Router */}
      <main className="main-content">
        {page === 'setup' && (
          <Setup 
            settings={settings} 
            setSettings={setSettings} 
            onStart={handleStartInterview} 
          />
        )}
        
        {page === 'interview' && (
          <Interview 
            settings={settings} 
            onComplete={handleInterviewComplete} 
            onExit={handleExitInterview} 
          />
        )}
        
        {page === 'dashboard' && (
          <Dashboard 
            summary={summary} 
            onRestart={handleRestart} 
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-color)', padding: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(10, 11, 16, 0.4)', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', justifyContent: 'center' }}>
        <div>
          © {new Date().getFullYear()} Gravity Talent. Powered by Multimodal Web Speech & OpenAI API Pipeline.
        </div>
        
      </footer>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [hasBrowserSupport, setHasBrowserSupport] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      setHasBrowserSupport(true);
      const rec = new SpeechRecognitionClass();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setTranscript(prev => (prev + ' ' + finalTranscript).trim());
        }
      };

      rec.onerror = (e) => {
        console.error('Speech recognition error:', e.error);
        if (e.error === 'no-speech') {
          // Keep listening or handle gracefully
        }
      };

      rec.onend = () => {
        // Automatically restart if we are supposed to be listening
        if (recognitionRef.current && isListening) {
          try {
            recognitionRef.current.start();
          } catch (err) {
            // ignore if already started
          }
        }
      };

      recognitionRef.current = rec;
    }
  }, [isListening]);

  const startListening = () => {
    if (!recognitionRef.current) return;
    setTranscript('');
    setIsListening(true);
    try {
      recognitionRef.current.start();
    } catch (err) {
      console.warn('Recognition start error:', err);
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    setIsListening(false);
    try {
      recognitionRef.current.stop();
    } catch (err) {
      console.warn('Recognition stop error:', err);
    }
  };

  const resetTranscript = () => {
    setTranscript('');
  };

  return {
    isListening,
    transcript,
    hasBrowserSupport,
    startListening,
    stopListening,
    resetTranscript
  };
}

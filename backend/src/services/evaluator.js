/**
 * Evaluates the full interview logs to produce a comprehensive review dashboard
 * @param {Array} history - Array of QA steps: { question, answer, duration, evaluation }
 * @param {Array<string>} targetKeywords - List of keywords for the target role
 * @returns {Object} Final dashboard analysis
 */
export function evaluateSession(history, targetKeywords = []) {
  // Filter out any introductory greetings or empty replies
  const validAnswers = history.filter(item => item.answer && item.answer.trim().length > 0);
  
  if (validAnswers.length === 0) {
    return {
      overallScore: 0,
      accuracyScore: 0,
      communicationScore: 0,
      fillerWordCount: 0,
      fillerWordAnalysis: {},
      averageWpm: 0,
      pacingStatus: 'No speech recorded',
      keywordCoverage: 0,
      keywordsHit: [],
      keywordsMissed: targetKeywords,
      questionBreakdown: [],
      generalFeedback: "No answers were recorded during the interview session. Please try again and speak into your microphone."
    };
  }

  // 1. Calculate Average Accuracy Score
  let totalAccuracy = 0;
  let scoreCount = 0;
  
  validAnswers.forEach(item => {
    if (item.evaluation && typeof item.evaluation.accuracy_score === 'number') {
      totalAccuracy += item.evaluation.accuracy_score;
      scoreCount++;
    }
  });
  
  const avgAccuracy = scoreCount > 0 ? Math.round(totalAccuracy / scoreCount) : 70;

  // 2. Filler Words Analysis
  const fillerWordFreq = {
    um: 0,
    uh: 0,
    like: 0,
    "you know": 0,
    basically: 0,
    actually: 0,
    so: 0
  };

  let totalFillerCount = 0;
  
  validAnswers.forEach(item => {
    const text = item.answer.toLowerCase();
    
    // Count exact filler word matches in transcript
    Object.keys(fillerWordFreq).forEach(word => {
      // Use regex to find word boundaries
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        fillerWordFreq[word] += matches.length;
        totalFillerCount += matches.length;
      }
    });

    // Also blend in LLM-detected fillers if any
    if (item.evaluation && Array.isArray(item.evaluation.filler_words_detected)) {
      item.evaluation.filler_words_detected.forEach(word => {
        const cleaned = word.toLowerCase().trim();
        if (cleaned && fillerWordFreq[cleaned] !== undefined) {
          // Double check we don't double count, but ensure it's captured
          if (fillerWordFreq[cleaned] === 0) {
            fillerWordFreq[cleaned] = 1;
            totalFillerCount += 1;
          }
        }
      });
    }
  });

  // Filter out filler words with 0 counts for clean output
  const activeFillers = {};
  Object.keys(fillerWordFreq).forEach(w => {
    if (fillerWordFreq[w] > 0) {
      activeFillers[w] = fillerWordFreq[w];
    }
  });

  // 3. Pacing & Words Per Minute (WPM)
  let totalWords = 0;
  let totalDurationSeconds = 0;
  const questionBreakdown = [];

  validAnswers.forEach((item, index) => {
    const wordCount = item.answer.split(/\s+/).filter(Boolean).length;
    const duration = item.duration || 15; // default 15s if missing
    
    totalWords += wordCount;
    totalDurationSeconds += duration;

    const wpm = Math.round(wordCount / (duration / 60));
    
    let answerPacing = 'Ideal';
    if (wpm < 110) answerPacing = 'Slow';
    if (wpm > 150) answerPacing = 'Fast';

    questionBreakdown.push({
      questionNumber: index + 1,
      question: item.question,
      answer: item.answer,
      duration: duration,
      wpm: wpm,
      pacing: answerPacing,
      accuracyScore: item.evaluation?.accuracy_score || 70,
      feedback: item.evaluation?.feedback || 'No feedback available.',
      tone: item.evaluation?.tone_assessment || 'Professional',
      keywordsFound: item.evaluation?.technical_keywords_found || []
    });
  });

  const totalDurationMinutes = totalDurationSeconds / 60;
  const avgWpm = totalDurationMinutes > 0 ? Math.round(totalWords / totalDurationMinutes) : 0;
  
  let pacingStatus = 'Ideal (110 - 150 WPM)';
  if (avgWpm < 110) {
    pacingStatus = 'Slow / Hesitant (< 110 WPM)';
  } else if (avgWpm > 150) {
    pacingStatus = 'Fast / Rushed (> 150 WPM)';
  }

  // 4. Keywords Coverage
  const keywordsHitSet = new Set();
  
  validAnswers.forEach(item => {
    const text = item.answer.toLowerCase();
    
    // Check our preset list
    targetKeywords.forEach(kw => {
      if (text.includes(kw.toLowerCase())) {
        keywordsHitSet.add(kw);
      }
    });

    // Merge in LLM-detected keywords
    if (item.evaluation && Array.isArray(item.evaluation.technical_keywords_found)) {
      item.evaluation.technical_keywords_found.forEach(kw => {
        // Find matching preset keyword case-insensitively
        const matchedPreset = targetKeywords.find(p => p.toLowerCase() === kw.toLowerCase());
        if (matchedPreset) {
          keywordsHitSet.add(matchedPreset);
        } else if (kw.trim().length > 0) {
          keywordsHitSet.add(kw); // Keep LLM-detected if relevant
        }
      });
    }
  });

  const keywordsHit = Array.from(keywordsHitSet);
  const keywordsMissed = targetKeywords.filter(kw => !keywordsHitSet.has(kw));
  const keywordCoverage = targetKeywords.length > 0 
    ? Math.round((keywordsHit.filter(k => targetKeywords.includes(k)).length / targetKeywords.length) * 100)
    : 0;

  // 5. Final Communication Score
  // Base communication score starts at 90. 
  // Deduct points for filler words (1 pt per filler, max 15 pt deduction).
  // Deduct/add for pacing.
  let communicationScore = 90;
  communicationScore -= Math.min(totalFillerCount, 15);
  
  if (avgWpm < 100) communicationScore -= 10;
  if (avgWpm > 160) communicationScore -= 8;
  communicationScore = Math.max(50, Math.min(100, communicationScore));

  // 6. Overall Weighted Score
  // 60% Technical Accuracy, 30% Communication Style, 10% Keyword Coverage
  const overallScore = Math.round((avgAccuracy * 0.60) + (communicationScore * 0.30) + (keywordCoverage * 0.10));

  // 7. General Feedback Compilation
  let generalFeedback = `You did a solid job in this mock interview. Your technical accuracy averaged ${avgAccuracy}%. `;
  if (avgAccuracy >= 85) {
    generalFeedback += "You demonstrated a strong conceptual grasp of the target role's core subjects. ";
  } else if (avgAccuracy >= 70) {
    generalFeedback += "You have a good foundational baseline, but there are minor technical gaps or hand-waving in your explanations. ";
  } else {
    generalFeedback += "You struggled to explain key technical details accurately. Review the feedback for each question. ";
  }

  if (totalFillerCount > 10) {
    generalFeedback += `We noticed heavy reliance on filler words (used ${totalFillerCount} times). Practicing structured answers (like the STAR method) and pausing briefly instead of saying 'like' or 'um' will boost your communication clarity. `;
  } else {
    generalFeedback += "Your communication style was clean with low usage of filler words. ";
  }

  if (avgWpm < 110) {
    generalFeedback += `Your speaking pace (${avgWpm} WPM) is a bit slow. Try to build momentum by answering confidently. `;
  } else if (avgWpm > 150) {
    generalFeedback += `Your pace is fast (${avgWpm} WPM). Slowing down slightly will help the interviewer process your answers and make you sound more composed. `;
  } else {
    generalFeedback += "Your delivery pace was at a very professional, ideal conversational speed. ";
  }

  return {
    overallScore,
    accuracyScore: avgAccuracy,
    communicationScore,
    fillerWordCount: totalFillerCount,
    fillerWordAnalysis: activeFillers,
    averageWpm: avgWpm,
    pacingStatus,
    keywordCoverage,
    keywordsHit,
    keywordsMissed,
    questionBreakdown,
    generalFeedback
  };
}

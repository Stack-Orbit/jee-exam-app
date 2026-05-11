import React, { useState, useEffect } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

function Exam() {
  const [activeSection, setActiveSection] = useState('');
  const [activeQuestion, setActiveQuestion] = useState(1);
  const [sectionsList, setSectionsList] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [testData, setTestData] = useState(null);
  
  // New States
  const [showInstructions, setShowInstructions] = useState(true);
  const [instructionsAccepted, setInstructionsAccepted] = useState(false);
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  
  // Timer State (3 hours = 10800 seconds)
  const [timeLeft, setTimeLeft] = useState(10800);
  const [mode, setMode] = useState('exam');

  useEffect(() => {
    document.body.className = 'exam-active';
    
    const params = new URLSearchParams(window.location.search);
    const testId = params.get('testId') || params.get('id');
    const currentMode = params.get('mode') || 'exam';
    setMode(currentMode);
    
    if (currentMode === 'review' || currentMode === 'mistakes') {
      setShowInstructions(false);
      setTestCompleted(true);
    }
    
    if (testId) {
      const savedTests = JSON.parse(localStorage.getItem('jee_ai_tests') || '[]');
      const test = savedTests.find(t => t.id.toString() === testId);
      
      if (test) {
        setTestData(test);
        const sections = test.sections.map(s => s.sectionName);
        setSectionsList(sections);
        setActiveSection(sections[0]);

        if (currentMode === 'review' || currentMode === 'mistakes') {
           const userStr = localStorage.getItem('airlab_user');
           const userEmail = userStr ? JSON.parse(userStr).email : 'default';
           const results = JSON.parse(localStorage.getItem(`jee_student_results_${userEmail}`) || '{}');
           const res = results[testId];
           if (res) {
             let qs = res.questions;
             if (currentMode === 'mistakes') {
               qs = qs.filter(q => !q.isCorrect); // Wrong and Unattempted
             }
             setQuestions(qs);
             if (qs.length > 0) {
               setActiveSection(qs[0].sectionName);
               setActiveQuestion(qs[0].id);
             }
           }
        } else {
          let globalId = 1;
          const flatQuestions = [];
          test.sections.forEach(sec => {
            sec.questions.forEach(q => {
              flatQuestions.push({
                id: globalId,
                sectionName: sec.sectionName,
                status: globalId === 1 ? 'not-answered' : 'not-visited',
                text: q.text,
                imageUrl: q.imageUrl,
                type: q.type || 'single_correct',
                correctOption: q.correctOption,
                userAnswer: '',
                options: q.options ? q.options.map(o => ({ text: o.text, imageUrl: o.imageUrl, id: o.id })) : []
              });
              globalId++;
            });
          });
          setQuestions(flatQuestions);
        }
      }
    } else {
      // Fallback
      setTestData({ testName: "JEE Main Sample Test" });
      setSectionsList(['Phy Sec 1']);
      setActiveSection('Phy Sec 1');
      setQuestions([{
        id: 1, sectionName: 'Phy Sec 1', status: 'not-answered', type: 'numerical', 
        text: "Sample NVQ Question", imageUrl: null, options: []
      }]);
    }

    return () => { document.body.className = ''; };
  }, []);

  // Timer Countdown Logic
  const [timeSpent, setTimeSpent] = useState({ math: 0, phy: 0, chem: 0 });
  const questionsRef = React.useRef(questions);
  const timeSpentRef = React.useRef(timeSpent);
  
  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { timeSpentRef.current = timeSpent; }, [timeSpent]);

  const submitTest = () => {
    if (testCompleted) return;
    
    const currentQuestions = questionsRef.current;
    const currentTimeSpent = timeSpentRef.current;
    
    const finalQuestions = currentQuestions.map(q => {
      if (q.userAnswer && q.userAnswer !== '' && (q.status === 'not-answered' || q.status === 'not-visited')) {
        return { ...q, status: 'answered' };
      }
      return q;
    });
    
    let totalMarks = 0;
    let mathMarks = 0, phyMarks = 0, chemMarks = 0;
    let attempted = 0;
    let correctCnt = 0;
    let incorrectCnt = 0;
    
    finalQuestions.forEach(q => {
       let isCorrect = false;
       let isAttempted = false;
       
       if (q.userAnswer !== undefined && q.userAnswer !== '') {
          isAttempted = true;
          attempted++;
          
          if (q.type === 'numerical') {
             const uAns = parseFloat(q.userAnswer);
             const cAns = parseFloat(q.correctOption);
             if (!isNaN(uAns) && !isNaN(cAns) && Math.abs(uAns - cAns) <= 0.3) {
                 isCorrect = true;
             }
          } else {
             if (q.userAnswer.toString().trim().toLowerCase() === (q.correctOption || '').toString().trim().toLowerCase()) {
                 isCorrect = true;
             }
          }
          
          const marksChange = isCorrect ? 4 : -1;
          totalMarks += marksChange;
          if (isCorrect) correctCnt++; else incorrectCnt++;
          
          const sec = (q.sectionName || '').toLowerCase();
          if (sec.includes('math')) mathMarks += marksChange;
          else if (sec.includes('phy')) phyMarks += marksChange;
          else if (sec.includes('chem')) chemMarks += marksChange;
       }
       q.isCorrect = isCorrect;
       q.isAttempted = isAttempted;
    });
    
    const timeTaken = 10800 - Math.max(0, timeLeft);

    const userStr = localStorage.getItem('airlab_user');
    const userEmail = userStr ? JSON.parse(userStr).email : 'default';
    const results = JSON.parse(localStorage.getItem(`jee_student_results_${userEmail}`) || '{}');
    if (testData) {
       results[testData.id] = {
          timeTaken, timeSpent: currentTimeSpent, totalMarks, mathMarks, phyMarks, chemMarks,
          attempted, correctCnt, incorrectCnt, questions: finalQuestions
       };
       localStorage.setItem(`jee_student_results_${userEmail}`, JSON.stringify(results));
    }

    setQuestions(finalQuestions);
    setTestCompleted(true);
  };
  
  useEffect(() => {
    let interval = null;
    if (!showInstructions && !testCompleted && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
        
        setTimeSpent(prev => {
          const sec = (activeSection || '').toLowerCase();
          let key = '';
          if (sec.includes('math')) key = 'math';
          else if (sec.includes('phy')) key = 'phy';
          else if (sec.includes('chem')) key = 'chem';
          
          if (key) {
            return { ...prev, [key]: prev[key] + 1 };
          }
          return prev;
        });
        
      }, 1000);
    } else if (timeLeft === 0 && !testCompleted) {
      submitTest();
      setShowSubmitConfirmation(true);
      setTimeout(() => alert("Time is up! Your test has been auto-submitted."), 100);
    }
    return () => clearInterval(interval);
  }, [showInstructions, testCompleted, timeLeft, activeSection]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleNext = (newStatus) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === activeQuestion ? { ...q, status: newStatus } : q))
    );
    if (activeQuestion < questions.length) {
      const nextId = activeQuestion + 1;
      setActiveQuestion(nextId);
      setQuestions((prev) =>
        prev.map((q) => (q.id === nextId && q.status === 'not-visited' ? { ...q, status: 'not-answered' } : q))
      );
      
      const nextQ = questions.find(q => q.id === nextId);
      if (nextQ && nextQ.sectionName !== activeSection) {
        setActiveSection(nextQ.sectionName);
      }
    }
  };

  const clearResponse = () => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === activeQuestion ? { ...q, status: 'not-answered', userAnswer: '' } : q))
    );
  };

  const handleNumpadClick = (val) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === activeQuestion) {
        let currentAns = q.userAnswer || '';
        if (val === 'Backspace') currentAns = currentAns.slice(0, -1);
        else if (val === 'Clear All') currentAns = '';
        else if (val !== 'Left' && val !== 'Right') currentAns += val;
        
        const newStatus = currentAns.length > 0 ? 'answered' : 'not-answered';
        return { ...q, userAnswer: currentAns, status: newStatus };
      }
      return q;
    }));
  };

  const getShapeClass = (q) => {
    let baseClass = '';
    if (mode !== 'exam') {
      if (q.isCorrect) baseClass = 'shape-answered';
      else if (q.status === 'not-visited') baseClass = 'shape-not-visited';
      else baseClass = 'shape-not-answered';
    } else {
      switch (q.status) {
        case 'answered': baseClass = 'shape-answered'; break;
        case 'not-answered': baseClass = 'shape-not-answered'; break;
        case 'not-visited': baseClass = 'shape-not-visited'; break;
        case 'marked': baseClass = 'shape-marked'; break;
        case 'answered-marked': baseClass = 'shape-answered-marked'; break;
        default: baseClass = 'shape-not-visited';
      }
    }
    return q.id === activeQuestion ? `${baseClass} active` : baseClass;
  };

  const renderTextWithMath = (text) => {
    if (!text) return null;
    const parts = text.split(/(\\\(.*?\\\)|\\\[.*?\\\])/g);
    return parts.map((part, index) => {
      if (part.startsWith('\\(') && part.endsWith('\\)')) return <InlineMath key={index} math={part.slice(2, -2)} />;
      else if (part.startsWith('\\[') && part.endsWith('\\]')) return <BlockMath key={index} math={part.slice(2, -2)} />;
      return <span key={index}>{part}</span>;
    });
  };

  const currentQ = questions.find(q => q.id === activeQuestion);
  const currentSectionQuestions = questions.filter(q => q.sectionName === activeSection);
  const counts = currentSectionQuestions.reduce((acc, q) => { acc[q.status] = (acc[q.status] || 0) + 1; return acc; }, {});

  const reviewCounts = currentSectionQuestions.reduce((acc, q) => {
    if (q.isCorrect) acc.correct = (acc.correct || 0) + 1;
    else if (q.status === 'not-visited') acc.notVisited = (acc.notVisited || 0) + 1;
    else acc.incorrect = (acc.incorrect || 0) + 1;
    return acc;
  }, {});

  // INSTRUCTIONS PAGE
  if (showInstructions) {
    return (
      <div style={{ backgroundColor: '#fff', height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <header style={{ backgroundColor: '#1B75B4', color: 'white', padding: '15px 20px', fontSize: '1.2rem', fontWeight: 'bold' }}>
          {testData?.testName || 'Loading Test...'} - Instructions
        </header>
        <div style={{ flex: 1, padding: '40px', maxWidth: '1000px', margin: '0 auto', color: '#333' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>INSTRUCTIONS TO CANDIDATES</h2>
          <h4 style={{ marginBottom: '15px' }}>GENERAL INSTRUCTIONS</h4>
          <ol style={{ lineHeight: '1.8', fontSize: '1.1rem', marginBottom: '30px' }}>
            <li>Total duration of the paper is 180 minutes.</li>
            <li>The on-screen computer clock will be set at the server. The countdown timer in the top right corner of the computer screen will display the remaining time.</li>
            <li>The Question Palette displayed on the right side of screen will show the status of each question using official NTA symbols.</li>
          </ol>
          <div style={{ color: 'red', marginBottom: '15px' }}>All the questions will appear in English language.</div>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '15px', backgroundColor: '#f9f9f9', padding: '20px', border: '1px solid #ddd', cursor: 'pointer' }}>
            <input type="checkbox" style={{ width: '20px', height: '20px', marginTop: '5px' }} checked={instructionsAccepted} onChange={(e) => setInstructionsAccepted(e.target.checked)} />
            <span style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>
              I have read and understood the instructions. All computer hardware allotted to me are in proper working condition. I declare that I am not in possession of / not wearing / not carrying any prohibited gadget like mobile phone, bluetooth devices etc. /any prohibited material with me into the Examination Hall. I agree that in case of not adhering to the instructions, I shall be liable to be debarred from this Test and/or to disciplinary action.
            </span>
          </label>
          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <button 
              disabled={!instructionsAccepted}
              onClick={() => setShowInstructions(false)}
              style={{ backgroundColor: instructionsAccepted ? '#1B75B4' : '#ccc', color: 'white', padding: '12px 30px', fontSize: '1.1rem', border: 'none', cursor: instructionsAccepted ? 'pointer' : 'not-allowed', borderRadius: '4px' }}
            >
              I am ready to begin
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SUBMIT REVIEW PAGE
  if (showSubmitConfirmation) {
    return (
      <div style={{ backgroundColor: '#fff', height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <header style={{ backgroundColor: '#333', color: 'white', padding: '15px 20px', fontSize: '1.2rem', fontWeight: 'bold' }}>
          {testData?.testName}
        </header>
        <div style={{ flex: 1, padding: '40px', maxWidth: '1200px', margin: '0 auto', color: '#333', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc', textAlign: 'center' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ccc' }}>
                <th style={{ padding: '12px', borderRight: '1px solid #ccc', textAlign: 'left' }}>Section Name</th>
                <th style={{ padding: '12px', borderRight: '1px solid #ccc' }}>No. of Questions</th>
                <th style={{ padding: '12px', borderRight: '1px solid #ccc' }}>Answered</th>
                <th style={{ padding: '12px', borderRight: '1px solid #ccc' }}>Not Answered</th>
                <th style={{ padding: '12px', borderRight: '1px solid #ccc' }}>Marked for Review</th>
                <th style={{ padding: '12px', borderRight: '1px solid #ccc' }}>Answered & Marked for Review</th>
                <th style={{ padding: '12px' }}>Not Visited</th>
              </tr>
            </thead>
            <tbody>
              {sectionsList.map(sec => {
                const sq = questions.filter(q => q.sectionName === sec);
                const answered = sq.filter(q => q.status === 'answered' || q.status === 'answered-marked').length;
                const notAnswered = sq.filter(q => q.status === 'not-answered').length;
                const marked = sq.filter(q => q.status === 'marked').length;
                const ansMarked = sq.filter(q => q.status === 'answered-marked').length;
                const notVisited = sq.filter(q => q.status === 'not-visited').length;
                return (
                  <tr key={sec} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', borderRight: '1px solid #ccc', textAlign: 'left' }}>{sec}</td>
                    <td style={{ padding: '12px', borderRight: '1px solid #ccc' }}>{sq.length}</td>
                    <td style={{ padding: '12px', borderRight: '1px solid #ccc' }}>{answered}</td>
                    <td style={{ padding: '12px', borderRight: '1px solid #ccc' }}>{notAnswered}</td>
                    <td style={{ padding: '12px', borderRight: '1px solid #ccc' }}>{marked}</td>
                    <td style={{ padding: '12px', borderRight: '1px solid #ccc' }}>{ansMarked}</td>
                    <td style={{ padding: '12px' }}>{notVisited}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ textAlign: 'center', marginTop: '40px', fontSize: '1.2rem', marginBottom: '30px', color: testCompleted ? '#dc3545' : '#333', fontWeight: testCompleted ? 'bold' : 'normal' }}>
            {testCompleted ? "Time is up! Your test has been auto-submitted." : "Are you sure wish to submit this group of questions for marking ?"}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
            {!testCompleted && (
              <button onClick={() => setShowSubmitConfirmation(false)} style={{ backgroundColor: '#6c757d', color: 'white', padding: '12px 30px', fontSize: '1.1rem', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
                No! Go Back to Paper
              </button>
            )}
            <button onClick={() => { 
              if (!testCompleted) {
                submitTest();
                alert("Test successfully submitted for marking! Redirecting to Analysis Dashboard..."); 
                window.location.href = `/analysis?testId=${testData.id}`;
              } else {
                window.location.href = `/analysis?testId=${testData.id}`; 
              }
            }} style={{ backgroundColor: testCompleted ? '#1B75B4' : '#dc3545', color: 'white', padding: '12px 30px', fontSize: '1.1rem', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
              {testCompleted ? "View Test Analysis" : "Yes! Submit the Test"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // EXAM PAGE
  return (
    <div className="app-container">
      <header className="main-header">
        <div className="test-title">{testData?.testName || 'Loading Test...'}</div>
        <div className="header-actions">
          <button className="header-btn">
            <span style={{background: '#1B75B4', borderRadius: '50%', width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center'}}>i</span>
            Instructions
          </button>
          <button className="header-btn">
            <span style={{background: '#5CB85C', borderRadius: '4px', width: 16, height: 16, display: 'inline-block'}}></span>
            Question Paper
          </button>
        </div>
      </header>

      <div className="content-wrapper">
        <div className="left-area">
          <div className="paper-tab-bar">
            {testData?.testName?.substring(0, 20)}... ℹ️
          </div>
          
          <div className="sections-bar">
            <span style={{color: '#666'}}>Sections</span>
            <span>{mode === 'exam' ? `Time Left : ${formatTime(timeLeft)}` : <span style={{color: '#34d399', fontWeight: 'bold'}}>Review Mode</span>}</span>
          </div>

          <div className="section-tabs-container">
            {sectionsList.map(sec => (
              <div 
                key={sec} 
                className={`section-tab ${activeSection === sec ? 'active' : ''}`}
                onClick={() => {
                  setActiveSection(sec);
                  const firstQ = questions.find(q => q.sectionName === sec);
                  if(firstQ) {
                    setActiveQuestion(firstQ.id);
                    if(firstQ.status === 'not-visited' && mode === 'exam') {
                      setQuestions(prev => prev.map(old => old.id === firstQ.id ? {...old, status: 'not-answered'} : old));
                    }
                  }
                }}
              >
                {sec} <span style={{background: activeSection === sec ? '#fff' : '#1B75B4', color: activeSection === sec ? '#1B75B4' : '#fff', borderRadius: '50%', width: 14, height: 14, fontSize: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center'}}>i</span>
              </div>
            ))}
          </div>

          <div className="question-meta-bar">
            <span>Question Type: {currentQ?.type === 'numerical' ? 'Numerical Value' : 'Single Correct'}</span>
            <span className="marks-info">
              Marks for correct answer: <span className="marks-positive">4</span> | Negative Marks: <span className="marks-negative">-1.0</span>
            </span>
          </div>

          <div className="question-container">
            <div className="question-header">
              <span>Question No. {activeQuestion}</span>
              <button style={{background: '#1B75B4', color: 'white', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer'}}>↓</button>
            </div>
            
            <div className="question-content">
              <div style={{ fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '20px' }}>
                {renderTextWithMath(currentQ?.text)}
                {currentQ?.imageUrl && (
                  <div style={{ marginTop: '15px' }}>
                    <img src={currentQ.imageUrl} alt="Question Graphic" style={{ maxWidth: '100%', border: '1px solid #333', padding: '5px', background: 'white' }} />
                  </div>
                )}
              </div>
              
              {currentQ?.type === 'numerical' ? (
                <div className="numerical-input-area" style={{ marginTop: '20px' }}>
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '15px' }}>
                    <div>
                      <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '5px' }}>{mode !== 'exam' ? 'Your Answer' : 'Answer'}</div>
                      <input 
                        type="text" 
                        readOnly 
                        value={currentQ.userAnswer} 
                        style={{ 
                          width: '250px', padding: '10px', fontSize: '1.2rem', 
                          border: mode !== 'exam' ? (currentQ.isCorrect ? '2px solid #34d399' : '2px solid #f43f5e') : '1px solid #333', 
                          textAlign: 'center',
                          backgroundColor: mode !== 'exam' ? (currentQ.isCorrect ? 'rgba(52, 211, 153, 0.1)' : 'rgba(244, 63, 94, 0.1)') : 'white'
                        }}
                      />
                    </div>
                    {mode !== 'exam' && (
                      <div>
                        <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '5px' }}>Correct Answer</div>
                        <div style={{ width: '250px', padding: '10px', fontSize: '1.2rem', border: '2px solid #34d399', textAlign: 'center', backgroundColor: 'rgba(52, 211, 153, 0.1)', color: '#047857', fontWeight: 'bold' }}>
                          {currentQ.correctOption}
                        </div>
                      </div>
                    )}
                  </div>
                  {mode === 'exam' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 70px)', gap: '10px', width: 'fit-content' }}>
                      <button onClick={() => handleNumpadClick('Backspace')} style={{ gridColumn: 'span 3', padding: '12px', fontSize: '1rem', cursor: 'pointer', border: '1px solid #aaa' }}>Backspace</button>
                      {['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', '-'].map(val => (
                        <button key={val} onClick={() => handleNumpadClick(val)} style={{ padding: '15px', fontSize: '1.1rem', cursor: 'pointer', border: '1px solid #aaa', fontWeight: 'bold' }}>{val}</button>
                      ))}
                      <button onClick={() => handleNumpadClick('Left')} style={{ padding: '15px', fontSize: '1.1rem', cursor: 'pointer', border: '1px solid #aaa' }}>Left</button>
                      <button onClick={() => handleNumpadClick('Right')} style={{ padding: '15px', fontSize: '1.1rem', cursor: 'pointer', border: '1px solid #aaa' }}>Right</button>
                      <button onClick={() => handleNumpadClick('Clear All')} style={{ gridColumn: 'span 3', padding: '12px', fontSize: '1rem', cursor: 'pointer', border: '1px solid #aaa' }}>Clear All</button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="options-list">
                  {currentQ?.options.map((opt, idx) => {
                    const isUserAns = currentQ.userAnswer === opt.id;
                    const isCorrectAns = currentQ.correctOption === opt.id;
                    
                    let bgCol = 'transparent';
                    let borderCol = 'transparent';
                    
                    if (mode !== 'exam') {
                      if (isCorrectAns) {
                        bgCol = 'rgba(52, 211, 153, 0.15)';
                        borderCol = '#34d399';
                      } else if (isUserAns && !isCorrectAns) {
                        bgCol = 'rgba(244, 63, 94, 0.15)';
                        borderCol = '#f43f5e';
                      }
                    }

                    return (
                      <label key={idx} className="option-item" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px', cursor: mode === 'exam' ? 'pointer' : 'default', backgroundColor: bgCol, border: `1px solid ${borderCol}`, borderRadius: '8px' }}>
                        <input 
                          type="radio" 
                          name={`q_${currentQ.id}`} 
                          checked={isUserAns}
                          onChange={() => {
                            if (mode === 'exam') {
                              setQuestions(prev => prev.map(q => q.id === activeQuestion ? { ...q, userAnswer: opt.id, status: 'answered' } : q));
                            }
                          }}
                          disabled={mode !== 'exam'}
                          style={{ marginTop: '5px' }} 
                        />
                        <div style={{ flex: 1 }}>
                          {renderTextWithMath(opt.text)}
                          {opt.imageUrl && (
                            <div style={{ marginTop: '10px' }}>
                              <img src={opt.imageUrl} alt={`Option ${idx+1}`} style={{ maxWidth: '200px', border: '1px solid #333', padding: '5px', background: 'white' }} />
                            </div>
                          )}
                        </div>
                        {mode !== 'exam' && isCorrectAns && <span style={{ color: '#047857', fontWeight: 'bold', fontSize: '0.9rem' }}>✓ Correct Answer</span>}
                        {mode !== 'exam' && isUserAns && !isCorrectAns && <span style={{ color: '#be123c', fontWeight: 'bold', fontSize: '0.9rem' }}>✗ Your Answer</span>}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="left-footer">
            <div style={{display: 'flex', gap: 10}}>
              {mode === 'exam' && (
                <>
                  <button className="btn-secondary" onClick={() => handleNext('marked')}>Mark for Review & Next</button>
                  <button className="btn-secondary" onClick={clearResponse}>Clear Response</button>
                </>
              )}
            </div>
            {mode === 'exam' ? (
              <button className="btn-primary" onClick={() => {
                const hasAns = currentQ.userAnswer && currentQ.userAnswer !== '';
                handleNext(hasAns ? 'answered' : 'not-answered');
              }}>Save & Next</button>
            ) : (
              <button className="btn-primary" onClick={() => handleNext(currentQ.status)}>Next Question</button>
            )}
          </div>
        </div>

        <div className="right-palette">
          <div className="profile-section">
            <div className="profile-img">
              <svg viewBox="0 0 24 24" fill="#666" width="100%" height="100%"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            </div>
          </div>

          <div className="legend-grid">
            {mode === 'exam' ? (
              <>
                <div className="legend-item"><div className="legend-shape shape-answered">{counts['answered'] || 0}</div> Answered</div>
                <div className="legend-item"><div className="legend-shape shape-not-answered">{counts['not-answered'] || 0}</div> Not Answered</div>
                <div className="legend-item"><div className="legend-shape shape-not-visited" style={{background: '#e6e6e6', color: '#333'}}>{counts['not-visited'] || 0}</div> Not Visited</div>
                <div className="legend-item"><div className="legend-shape shape-marked">{counts['marked'] || 0}</div> Marked for review</div>
                <div className="legend-item" style={{gridColumn: '1 / span 2'}}><div className="legend-shape shape-answered-marked">{counts['answered-marked'] || 0}</div> Answered and Marked for Review</div>
              </>
            ) : (
              <>
                <div className="legend-item"><div className="legend-shape shape-answered">{reviewCounts.correct || 0}</div> Correct Qty</div>
                <div className="legend-item"><div className="legend-shape shape-not-answered">{reviewCounts.incorrect || 0}</div> Incorrect / Unattempted Qty</div>
                <div className="legend-item"><div className="legend-shape shape-not-visited" style={{background: '#e6e6e6', color: '#333'}}>{reviewCounts.notVisited || 0}</div> Not Visited</div>
              </>
            )}
          </div>

          <div className="palette-section-header">
            {activeSection}
          </div>

          <div className="palette-scroll-area">
            <div style={{marginBottom: 10, fontSize: 13}}>Choose a Question</div>
            <div className="palette-grid">
              {currentSectionQuestions.map((q) => (
                <button 
                  key={q.id}
                  className={`palette-btn ${getShapeClass(q)}`}
                  onClick={() => {
                     setActiveQuestion(q.id);
                     if(q.status === 'not-visited' && mode === 'exam') {
                       setQuestions(prev => prev.map(old => old.id === q.id ? {...old, status: 'not-answered'} : old));
                     }
                  }}
                >
                  {q.id}
                </button>
              ))}
            </div>
          </div>

          <div className="submit-btn-area">
            {mode === 'exam' ? (
              <button className="btn-submit" onClick={() => setShowSubmitConfirmation(true)}>Submit</button>
            ) : (
              <button className="btn-submit" style={{ backgroundColor: '#6c757d' }} onClick={() => window.location.href = `/analysis?testId=${testData?.id}`}>Go Back</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Exam;

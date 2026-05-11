import React, { useEffect, useState } from 'react';
import { ChevronLeft, Download, Clock, CheckCircle2, Calculator, Atom, FlaskConical, BarChart3 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

function Analysis() {
  const navigate = useNavigate();
  const location = useLocation();
  const [testId, setTestId] = useState(null);
  const [testData, setTestData] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [allTests, setAllTests] = useState([]);
  const [allResults, setAllResults] = useState({});
  const [filterMode, setFilterMode] = useState('All Tests');
  const [tabMode, setTabMode] = useState('Overall');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tid = params.get('testId');
    
    const tests = JSON.parse(localStorage.getItem('jee_ai_tests') || '[]');
    const userStr = localStorage.getItem('airlab_user');
    const userEmail = userStr ? JSON.parse(userStr).email : 'default';
    const results = JSON.parse(localStorage.getItem(`jee_student_results_${userEmail}`) || '{}');
    
    setAllTests(tests);
    setAllResults(results);

    if (tid) {
      setTestId(tid);
      const test = tests.find(t => t.id.toString() === tid);
      setTestData(test);
      setResultData(results[tid]);
    } else {
      setTestId(null);
    }
  }, [location.search]);

  // Single test view
  if (testId && testData && resultData) {
      return renderSingleAnalysis(testData, resultData, navigate);
  }

  // Global Performance View
  let completedTests = allTests.filter(t => allResults[t.id]).reverse();
  if (filterMode === 'Last 3 Tests') completedTests = completedTests.slice(0, 3);
  else if (filterMode === 'Last 5 Tests') completedTests = completedTests.slice(0, 5);
  else if (filterMode === 'Last 10 Tests') completedTests = completedTests.slice(0, 10);
  
  if (completedTests.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400 p-8 text-center">
              <BarChart3 className="w-16 h-16 mb-4 opacity-20" />
              <h2 className="text-xl font-bold mb-2">No tests completed yet</h2>
              <p className="text-sm">Attempt tests from the Dashboard to see your performance analytics here.</p>
          </div>
      );
  }

  // Calculate global stats
  const globalStats = calculateGlobalPerformance(completedTests, allResults);
  const { agg, testBreakdown } = globalStats;

  return (
      <div className="space-y-8 animate-fade pb-10 max-w-6xl mx-auto">
          <div>
              <h2 className="text-3xl font-bold" style={{color: 'var(--text-primary)'}}>Performance</h2>
              
              <div className="flex gap-2 mt-4">
                  {['All Tests', 'Last 3 Tests', 'Last 5 Tests', 'Last 10 Tests'].map(f => (
                      <button 
                          key={f} 
                          onClick={() => setFilterMode(f)}
                          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filterMode === f ? 'bg-blue-500/20 text-blue-500 border border-blue-500/30' : 'bg-transparent text-slate-500 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600'}`}
                      >
                          {f} {filterMode === f && <CheckCircle2 className="inline w-3 h-3 ml-1" />}
                      </button>
                  ))}
              </div>
          </div>

          <div className="card rounded-2xl overflow-hidden border" style={{borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)'}}>
              <div className="p-4 border-b" style={{borderColor: 'var(--border-color)'}}>
                  <h3 className="text-base font-bold" style={{color: 'var(--text-primary)'}}>Summary</h3>
              </div>
              
              <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                      <thead>
                          <tr className="border-b text-xs font-medium" style={{borderColor: 'var(--border-color)', color: 'var(--text-secondary)'}}>
                              <th className="p-4">Subject</th>
                              <th className="p-4 text-amber-500 text-center border-l" style={{borderColor: 'var(--border-color)'}}>Average<br/>Score</th>
                              <th className="p-4 text-emerald-500 text-center border-l" style={{borderColor: 'var(--border-color)'}}>Attempted<br/>Correct</th>
                              <th className="p-4 text-rose-500 text-center border-l" style={{borderColor: 'var(--border-color)'}}>Attempted<br/>Wrong</th>
                              <th className="p-4 text-indigo-500 text-center border-l" style={{borderColor: 'var(--border-color)'}}>Not<br/>Attempted</th>
                              <th className="p-4 text-slate-500 text-center border-l" style={{borderColor: 'var(--border-color)'}}>Not<br/>Visited Qs</th>
                          </tr>
                      </thead>
                      <tbody className="text-sm font-bold font-mono">
                          <StatRow title="Overall" icon={<CheckCircle2 className="w-4 h-4 text-blue-500" />} data={agg.overall} />
                          <StatRow title="Mathematics" icon={<Calculator className="w-4 h-4 text-blue-500" />} data={agg.math} />
                          <StatRow title="Physics" icon={<Atom className="w-4 h-4 text-emerald-500" />} data={agg.phy} />
                          <StatRow title="Chemistry" icon={<FlaskConical className="w-4 h-4 text-rose-500" />} data={agg.chem} />
                      </tbody>
                  </table>
              </div>
          </div>

          <div className="card rounded-2xl overflow-hidden border" style={{borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)'}}>
              <div className="p-4 border-b flex justify-between items-center" style={{borderColor: 'var(--border-color)'}}>
                  <h3 className="text-base font-bold" style={{color: 'var(--text-primary)'}}>Test-wise Breakdown</h3>
              </div>
              
              <div className="flex gap-1 border-b px-4 pt-4" style={{borderColor: 'var(--border-color)'}}>
                  {[
                      {id: 'Overall', icon: <CheckCircle2 className="w-3 h-3" />}, 
                      {id: 'Mathematics', icon: <Calculator className="w-3 h-3" />}, 
                      {id: 'Physics', icon: <Atom className="w-3 h-3" />}, 
                      {id: 'Chemistry', icon: <FlaskConical className="w-3 h-3" />}
                  ].map(tab => (
                      <button 
                          key={tab.id}
                          onClick={() => setTabMode(tab.id)}
                          className={`px-4 py-2 text-sm font-medium flex items-center gap-2 rounded-t-lg transition-colors ${tabMode === tab.id ? 'bg-blue-500/10 text-blue-500 border-b-2 border-blue-500' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}
                      >
                          {tab.icon} {tab.id}
                      </button>
                  ))}
              </div>

              <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                      <thead>
                          <tr className="border-b text-xs font-medium" style={{borderColor: 'var(--border-color)', color: 'var(--text-secondary)'}}>
                              <th className="p-4">Test Title</th>
                              <th className="p-4 text-amber-500 text-center border-l" style={{borderColor: 'var(--border-color)'}}>Total<br/>Score</th>
                              <th className="p-4 text-emerald-500 text-center border-l" style={{borderColor: 'var(--border-color)'}}>Attempted<br/>Correct</th>
                              <th className="p-4 text-rose-500 text-center border-l" style={{borderColor: 'var(--border-color)'}}>Attempted<br/>Wrong</th>
                              <th className="p-4 text-indigo-500 text-center border-l" style={{borderColor: 'var(--border-color)'}}>Not<br/>Attempted</th>
                              <th className="p-4 text-slate-500 text-center border-l" style={{borderColor: 'var(--border-color)'}}>Not<br/>Visited Qs</th>
                          </tr>
                      </thead>
                      <tbody>
                          {testBreakdown.map((t, i) => {
                              const key = tabMode === 'Overall' ? 'overall' : tabMode === 'Mathematics' ? 'math' : tabMode === 'Physics' ? 'phy' : 'chem';
                              const data = t[key];
                              return (
                              <tr key={i} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors" style={{borderColor: 'var(--border-color)'}}>
                                  <td className="p-4">
                                      <div className="font-bold text-sm mb-0.5" style={{color: 'var(--text-primary)'}}>{t.title}</div>
                                      <div className="text-xs" style={{color: 'var(--text-tertiary)'}}>{t.date}</div>
                                  </td>
                                  <td className="p-4 text-center border-l relative" style={{borderColor: 'var(--border-color)'}}>
                                      <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-gradient-to-b from-transparent via-amber-500 to-transparent opacity-50"></div>
                                      <span className="text-base font-bold font-mono" style={{color: 'var(--text-primary)'}}>{data.totalMarks}</span>
                                      <span className="text-xs text-slate-400"> /{data.maxMarks}</span>
                                  </td>
                                  <td className="p-4 text-center border-l relative" style={{borderColor: 'var(--border-color)'}}>
                                      <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-gradient-to-b from-transparent via-emerald-500 to-transparent opacity-50"></div>
                                      <span className="text-base font-bold font-mono" style={{color: 'var(--text-primary)'}}>{data.correct}</span>
                                      <span className="text-xs text-slate-400"> /{data.totalQs}</span>
                                  </td>
                                  <td className="p-4 text-center border-l relative" style={{borderColor: 'var(--border-color)'}}>
                                      <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-gradient-to-b from-transparent via-rose-500 to-transparent opacity-50"></div>
                                      <span className="text-base font-bold font-mono" style={{color: 'var(--text-primary)'}}>{data.wrong}</span>
                                      <span className="text-xs text-slate-400"> /{data.totalQs}</span>
                                  </td>
                                  <td className="p-4 text-center border-l relative" style={{borderColor: 'var(--border-color)'}}>
                                      <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-gradient-to-b from-transparent via-indigo-500 to-transparent opacity-50"></div>
                                      <span className="text-base font-bold font-mono" style={{color: 'var(--text-primary)'}}>{data.notAttempted}</span>
                                      <span className="text-xs text-slate-400"> /{data.totalQs}</span>
                                  </td>
                                  <td className="p-4 text-center border-l relative" style={{borderColor: 'var(--border-color)'}}>
                                      <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-gradient-to-b from-transparent via-slate-500 to-transparent opacity-50"></div>
                                      <span className="text-base font-bold font-mono" style={{color: 'var(--text-primary)'}}>{data.notVisited}</span>
                                      <span className="text-xs text-slate-400"> /{data.totalQs}</span>
                                  </td>
                              </tr>
                          )})}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>
  );
}

function StatRow({ title, icon, data }) {
  const avgScorePct = data.maxMarks > 0 ? ((data.marks / data.maxMarks) * 100).toFixed(0) : '0';
  const correctPct = data.totalQs > 0 ? ((data.correct / data.totalQs) * 100).toFixed(0) : '0';
  const wrongPct = data.totalQs > 0 ? ((data.wrong / data.totalQs) * 100).toFixed(0) : '0';
  const notAttPct = data.totalQs > 0 ? ((data.notAttempted / data.totalQs) * 100).toFixed(0) : '0';
  const notVisPct = data.totalQs > 0 ? ((data.notVisited / data.totalQs) * 100).toFixed(0) : '0';

  return (
      <tr className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors" style={{borderColor: 'var(--border-color)'}}>
          <td className="p-4 flex items-center gap-3">
              {icon}
              <span style={{color: 'var(--text-primary)'}}>{title}</span>
          </td>
          <td className="p-4 text-center border-l relative" style={{borderColor: 'var(--border-color)'}}>
              <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-gradient-to-b from-transparent via-amber-500 to-transparent"></div>
              <span style={{color: 'var(--text-primary)'}}>{avgScorePct}%</span>
          </td>
          <td className="p-4 text-center border-l relative" style={{borderColor: 'var(--border-color)'}}>
              <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-gradient-to-b from-transparent via-emerald-500 to-transparent"></div>
              <span style={{color: 'var(--text-primary)'}}>{correctPct}%</span>
          </td>
          <td className="p-4 text-center border-l relative" style={{borderColor: 'var(--border-color)'}}>
              <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-gradient-to-b from-transparent via-rose-500 to-transparent"></div>
              <span style={{color: 'var(--text-primary)'}}>{wrongPct}%</span>
          </td>
          <td className="p-4 text-center border-l relative" style={{borderColor: 'var(--border-color)'}}>
              <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-gradient-to-b from-transparent via-indigo-500 to-transparent"></div>
              <span style={{color: 'var(--text-primary)'}}>{notAttPct}%</span>
          </td>
          <td className="p-4 text-center border-l relative" style={{borderColor: 'var(--border-color)'}}>
              <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-gradient-to-b from-transparent via-slate-500 to-transparent"></div>
              <span style={{color: 'var(--text-primary)'}}>{notVisPct}%</span>
          </td>
      </tr>
  );
}

function calculateGlobalPerformance(tests, results) {
   let agg = {
      overall: { marks: 0, maxMarks: 0, correct: 0, wrong: 0, notAttempted: 0, notVisited: 0, totalQs: 0 },
      math: { marks: 0, maxMarks: 0, correct: 0, wrong: 0, notAttempted: 0, notVisited: 0, totalQs: 0 },
      phy: { marks: 0, maxMarks: 0, correct: 0, wrong: 0, notAttempted: 0, notVisited: 0, totalQs: 0 },
      chem: { marks: 0, maxMarks: 0, correct: 0, wrong: 0, notAttempted: 0, notVisited: 0, totalQs: 0 },
   };

   let testBreakdown = [];

   tests.forEach(test => {
     const res = results[test.id];
     if (!res) return;

     let tStat = {
        id: test.id, title: test.title || test.testName, date: new Date().toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'}), 
        overall: {
            totalMarks: res.totalMarks || 0, maxMarks: 300,
            correct: res.correctCnt || 0, wrong: res.incorrectCnt || 0,
            notAttempted: 0, notVisited: 0, totalQs: res.questions ? res.questions.length : 0
        },
        math: { totalMarks: res.mathMarks || 0, maxMarks: 100, correct: 0, wrong: 0, notAttempted: 0, notVisited: 0, totalQs: 0 },
        phy: { totalMarks: res.phyMarks || 0, maxMarks: 100, correct: 0, wrong: 0, notAttempted: 0, notVisited: 0, totalQs: 0 },
        chem: { totalMarks: res.chemMarks || 0, maxMarks: 100, correct: 0, wrong: 0, notAttempted: 0, notVisited: 0, totalQs: 0 }
     };

     if (res.questions) {
         res.questions.forEach(q => {
            let subj = q.subject?.toLowerCase() || '';
            let sKey = subj.includes('math') ? 'math' : subj.includes('phy') ? 'phy' : 'chem';
            
            tStat[sKey].totalQs++;
            
            let status = 'attempted';
            if (q.status === 'not-visited') status = 'not-visited';
            else if (!q.isAttempted) status = 'not-attempted';

            if (status === 'not-visited') {
                tStat[sKey].notVisited++;
                tStat.overall.notVisited++;
            } else if (status === 'not-attempted') {
                tStat[sKey].notAttempted++;
                tStat.overall.notAttempted++;
            } else if (q.isCorrect) {
                tStat[sKey].correct++;
            } else {
                tStat[sKey].wrong++;
            }
         });
     }

     testBreakdown.push(tStat);

     agg.overall.marks += tStat.overall.totalMarks;
     agg.overall.maxMarks += tStat.overall.maxMarks;
     agg.overall.correct += tStat.overall.correct;
     agg.overall.wrong += tStat.overall.wrong;
     agg.overall.notAttempted += tStat.overall.notAttempted;
     agg.overall.notVisited += tStat.overall.notVisited;
     agg.overall.totalQs += tStat.overall.totalQs;

     ['math', 'phy', 'chem'].forEach(k => {
        agg[k].marks += tStat[k].totalMarks;
        agg[k].maxMarks += tStat[k].maxMarks;
        agg[k].correct += tStat[k].correct;
        agg[k].wrong += tStat[k].wrong;
        agg[k].notAttempted += tStat[k].notAttempted;
        agg[k].notVisited += tStat[k].notVisited;
        agg[k].totalQs += tStat[k].totalQs;
     });
   });

   return { agg, testBreakdown };
}

function renderSingleAnalysis(testData, resultData, navigate) {
  const { totalMarks, mathMarks, phyMarks, chemMarks, attempted, correctCnt, incorrectCnt, timeTaken, questions } = resultData;
  const accuracy = attempted > 0 ? ((correctCnt / attempted) * 100).toFixed(2) : '0.00';
  const notSeen = questions ? questions.filter(q => q.status === 'not-visited').length : 0;
  const seenNotAttempted = questions ? questions.filter(q => !q.isAttempted && q.status !== 'not-visited').length : 0;
  
  const ts = resultData.timeSpent || { math: 0, phy: 0, chem: 0 };
  const totalSecs = Math.max(1, ts.math + ts.phy + ts.chem);
  const mathPct = ((ts.math / totalSecs) * 100).toFixed(1);
  const phyPct = ((ts.phy / totalSecs) * 100).toFixed(1);
  const chemPct = ((ts.chem / totalSecs) * 100).toFixed(1);

  let predictedPercentileDisplay = "N/A";
  let percentileSubtext = "Based on basic estimation";

  if (testData?.percentileMapping?.percentiles && testData?.percentileMapping?.marks) {
      const pts = testData.percentileMapping.percentiles;
      const mks = testData.percentileMapping.marks;
      // create points array and sort by marks ascending
      let dataPoints = pts.map((p, i) => ({ pct: parseFloat(p), mark: parseFloat(mks[i]) }))
          .filter(d => !isNaN(d.pct) && !isNaN(d.mark))
          .sort((a,b) => a.mark - b.mark);
      
      if (dataPoints.length > 0) {
          if (dataPoints[0].mark > 0) {
              dataPoints.unshift({ pct: Math.max(0, dataPoints[0].pct - 20), mark: 0 }); // rough estimate for 0 marks
          }
          if (dataPoints[dataPoints.length - 1].mark < 300) {
              dataPoints.push({ pct: 100, mark: 300 });
          }

          let lower = dataPoints[0];
          let upper = dataPoints[dataPoints.length - 1];
          for (let i = 0; i < dataPoints.length - 1; i++) {
              if (totalMarks >= dataPoints[i].mark && totalMarks <= dataPoints[i+1].mark) {
                  lower = dataPoints[i];
                  upper = dataPoints[i+1];
                  break;
              }
          }
          if (lower.mark === upper.mark) {
              predictedPercentileDisplay = lower.pct.toFixed(2) + " %ile";
          } else {
              const ratio = (totalMarks - lower.mark) / (upper.mark - lower.mark);
              const interp = lower.pct + ratio * (upper.pct - lower.pct);
              predictedPercentileDisplay = Math.min(100, Math.max(0, interp)).toFixed(2) + " %ile";
          }
          percentileSubtext = `Based on: ${testData.percentileMapping.mappingName}`;
      } else {
          predictedPercentileDisplay = Math.min(99.9, Math.max(40, (totalMarks / 300) * 100 + 40)).toFixed(1) + " %ile";
      }
  } else {
      predictedPercentileDisplay = Math.min(99.9, Math.max(40, (totalMarks / 300) * 100 + 40)).toFixed(1) + " %ile";
  }

  const isLongText = predictedPercentileDisplay.length > 12;

  return (
    <div className="space-y-6 animate-fade pb-10">
      <div className="flex items-center justify-between">
          <div>
              <button onClick={() => navigate('/tests')} className="text-xs flex items-center gap-1 mb-1 transition-colors hover:text-blue-400" style={{color: 'var(--text-tertiary)'}}>
                  <ChevronLeft className="w-3 h-3" />
                  Back to Tests
              </button>
              <h2 className="text-2xl font-bold glow-text" style={{color: 'var(--text-primary)'}}>Test Analysis</h2>
              <p className="text-xs mt-0.5" style={{color: 'var(--text-tertiary)'}}>{testData.title || testData.testName}</p>
          </div>
          <div className="flex gap-3">
              <button className="px-4 py-2 rounded-xl text-xs font-medium border transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2" style={{borderColor: 'var(--border-color)', color: 'var(--text-secondary)'}}>
                  <Download className="w-4 h-4" />
                  Download Analysis
              </button>
              <button onClick={() => window.location.href = `/exam?testId=${testData.id}&mode=review`} className="px-4 py-2 rounded-xl text-xs font-medium transition-all shadow-lg flex items-center gap-2" style={{ background: 'linear-gradient(to right, #2563eb, #4f46e5)', color: 'white', boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)' }}>
                  View Solution
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
              </button>
          </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="gradient-border p-5 relative overflow-hidden shadow-md dark:shadow-none border border-slate-200 dark:border-transparent">
              <div className="absolute inset-0 percentile-shine opacity-30"></div>
              <div className="relative z-10 text-center">
                  <div className="text-xs font-bold uppercase tracking-wider mb-2 text-blue-700 dark:text-blue-400">Overall Score</div>
                  <div className="text-5xl font-black font-sans text-blue-700 dark:text-blue-500 glow-text" style={{ fontFamily: 'Arial, sans-serif' }}>{totalMarks}<span className="text-xl text-blue-600/70 dark:text-blue-400/60">/300</span></div>
              </div>
          </div>
          <div className="glass-card rounded-2xl p-5 text-center stat-hover shadow-sm border border-slate-200 dark:border-transparent">
              <div className="text-xs font-bold uppercase tracking-wider mb-2 text-slate-500 dark:text-slate-400">Math Score</div>
              <div className="text-4xl font-black font-sans text-blue-600 dark:text-blue-400" style={{ fontFamily: 'Arial, sans-serif' }}>{mathMarks}<span className="text-lg text-blue-500/60 dark:text-blue-400/50">/100</span></div>
          </div>
          <div className="glass-card rounded-2xl p-5 text-center stat-hover shadow-sm border border-slate-200 dark:border-transparent">
              <div className="text-xs font-bold uppercase tracking-wider mb-2 text-slate-500 dark:text-slate-400">Phy Score</div>
              <div className="text-4xl font-black font-sans text-indigo-600 dark:text-indigo-400" style={{ fontFamily: 'Arial, sans-serif' }}>{phyMarks}<span className="text-lg text-indigo-500/60 dark:text-indigo-400/50">/100</span></div>
          </div>
          <div className="glass-card rounded-2xl p-5 text-center stat-hover shadow-sm border border-slate-200 dark:border-transparent">
              <div className="text-xs font-bold uppercase tracking-wider mb-2 text-slate-500 dark:text-slate-400">Chem Score</div>
              <div className="text-4xl font-black font-sans text-sky-600 dark:text-sky-400" style={{ fontFamily: 'Arial, sans-serif' }}>{chemMarks}<span className="text-lg text-sky-500/60 dark:text-sky-400/50">/100</span></div>
          </div>
          <div className="gradient-border p-5 relative overflow-hidden stat-hover">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-blue-500/10 to-cyan-500/10"></div>
              <div className="relative z-10 text-center">
                  <div className="text-xs font-bold uppercase tracking-wider mb-1 text-violet-700 dark:text-violet-400 flex items-center justify-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                      Predicted Percentile
                  </div>
                  <div className={`font-extrabold font-mono bg-gradient-to-r from-violet-700 via-blue-700 to-cyan-700 dark:from-violet-400 dark:via-blue-400 dark:to-cyan-400 bg-clip-text text-transparent glow-text ${isLongText ? 'text-xl leading-tight mt-1' : 'text-4xl'}`}>{predictedPercentileDisplay}</div>
                  <div className="text-[10px] mt-1 font-bold text-violet-600 dark:text-violet-400/70">{percentileSubtext}</div>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card rounded-2xl p-5 stat-hover">
              <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-tertiary)'}}>Qs Attempted</span>
              </div>
              <div className="text-3xl font-bold font-mono" style={{color: 'var(--text-primary)'}}>{attempted}<span className="text-base" style={{color: 'var(--text-tertiary)'}}>/75</span></div>
          </div>
          <div className="glass-card rounded-2xl p-5 stat-hover">
              <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-tertiary)'}}>Qs Correct</span>
              </div>
              <div className="text-3xl font-bold font-mono text-emerald-400">{correctCnt}</div>
          </div>
          <div className="glass-card rounded-2xl p-5 stat-hover">
              <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-tertiary)'}}>Qs Wrong</span>
              </div>
              <div className="text-3xl font-bold font-mono text-rose-400">{incorrectCnt}</div>
          </div>
          <div className="glass-card rounded-2xl p-5 stat-hover">
              <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-tertiary)'}}>Accuracy</span>
              </div>
              <div className="text-3xl font-bold font-mono" style={{color: 'var(--text-primary)'}}>{accuracy}%</div>
          </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="glass-card rounded-2xl p-5 stat-hover">
              <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-tertiary)'}}>Qs Seen (Not Attempted)</span>
              </div>
              <div className="text-3xl font-bold font-mono" style={{color: 'var(--text-primary)'}}>{seenNotAttempted}</div>
          </div>
          <div className="glass-card rounded-2xl p-5 stat-hover">
              <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-500/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-tertiary)'}}>Not Seen</span>
              </div>
              <div className="text-3xl font-bold font-mono" style={{color: 'var(--text-primary)'}}>{notSeen}</div>
          </div>
          <button onClick={() => window.location.href = `/exam?testId=${testData.id}&mode=review`} className="glass-card rounded-2xl p-5 stat-hover text-left group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-blue-600/5 to-indigo-600/0 group-hover:via-blue-600/10 transition-all"></div>
              <div className="relative z-10 flex items-center justify-between h-full">
                  <div>
                      <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                          </div>
                          <span className="text-xs font-medium uppercase tracking-wider text-blue-400">Review Full Test</span>
                      </div>
                      <div className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>Go through all questions</div>
                  </div>
                  <svg className="w-5 h-5 text-blue-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
              </div>
          </button>
      </div>

      <div className="glass-card rounded-2xl p-6">
          <h4 className="text-sm font-semibold mb-5 flex items-center gap-2" style={{color: 'var(--text-primary)'}}>
              <Clock className="w-4 h-4 text-blue-400" />
              Subject Time Spent Breakdown
          </h4>
          <div className="space-y-5">
              <div>
                  <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium" style={{color: 'var(--text-primary)'}}>Physics</span>
                      <span className="font-mono text-xs" style={{color: 'var(--text-tertiary)'}}>{Math.floor(ts.phy / 60)}m {ts.phy % 60}s</span>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden" style={{backgroundColor: 'var(--bg-tertiary)'}}>
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" style={{width: `${phyPct}%`}}></div>
                  </div>
              </div>
              <div>
                  <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium" style={{color: 'var(--text-primary)'}}>Chemistry</span>
                      <span className="font-mono text-xs" style={{color: 'var(--text-tertiary)'}}>{Math.floor(ts.chem / 60)}m {ts.chem % 60}s</span>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden" style={{backgroundColor: 'var(--bg-tertiary)'}}>
                      <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full" style={{width: `${chemPct}%`}}></div>
                  </div>
              </div>
              <div>
                  <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium" style={{color: 'var(--text-primary)'}}>Mathematics</span>
                      <span className="font-mono text-xs" style={{color: 'var(--text-tertiary)'}}>{Math.floor(ts.math / 60)}m {ts.math % 60}s</span>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden" style={{backgroundColor: 'var(--bg-tertiary)'}}>
                      <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full" style={{width: `${mathPct}%`}}></div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
}

export default Analysis;

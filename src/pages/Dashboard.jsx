import { useEffect, useState } from 'react';
import { Sparkles, ChevronRight, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const [papers, setPapers] = useState([]);
  const [stats, setStats] = useState({
    latestScore: '-',
    totalScore: 300,
    scoreDiff: 0,
    accuracy: '0%',
    testsLast7Days: 0,
    mathMastery: 0,
    phyMastery: 0,
    chemMastery: 0
  });

  useEffect(() => {
    // Load AI Generated papers from local storage
    const aiTests = JSON.parse(localStorage.getItem('jee_ai_tests') || '[]');
    
    const formattedAiTests = aiTests.map(test => {
      const totalQuestions = test.sections ? test.sections.reduce((acc, sec) => acc + (sec.questions?.length || 0), 0) : 
                           (test.questions ? test.questions.length : 0);
      return {
        id: test.id,
        type: 'AI Generated',
        year: 'New',
        title: test.testName || 'AI Custom Test',
        questions: totalQuestions,
        duration: '180 mins',
        isAi: true
      };
    });

    const userStr = localStorage.getItem('airlab_user');
    const userEmail = userStr ? JSON.parse(userStr).email : 'default';
    const studentResults = JSON.parse(localStorage.getItem(`jee_student_results_${userEmail}`) || '{}');
    
    // Calculate stats
    const resultsArr = Object.values(studentResults);
    let newStats = { ...stats };
    
    if (resultsArr.length > 0) {
      const latestTest = resultsArr[resultsArr.length - 1];
      const previousTest = resultsArr.length > 1 ? resultsArr[resultsArr.length - 2] : null;
      
      newStats.latestScore = latestTest.totalMarks;
      newStats.scoreDiff = previousTest ? (latestTest.totalMarks - previousTest.totalMarks) : 0;
      
      let totalAttempted = 0;
      let totalCorrect = 0;
      let totalMath = 0;
      let totalPhy = 0;
      let totalChem = 0;
      
      resultsArr.forEach(res => {
        totalAttempted += res.attempted || 0;
        totalCorrect += res.correctCnt || 0;
        totalMath += res.mathMarks || 0;
        totalPhy += res.phyMarks || 0;
        totalChem += res.chemMarks || 0;
      });
      
      newStats.accuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) + '%' : '0%';
      newStats.testsLast7Days = resultsArr.length; // Approximate
      
      const maxSubjectScore = resultsArr.length * 100; // 100 per subject per test
      newStats.mathMastery = Math.max(0, Math.round((totalMath / maxSubjectScore) * 100));
      newStats.phyMastery = Math.max(0, Math.round((totalPhy / maxSubjectScore) * 100));
      newStats.chemMastery = Math.max(0, Math.round((totalChem / maxSubjectScore) * 100));
    }
    
    setStats(newStats);
    
    setPapers(formattedAiTests.map(p => ({
      ...p,
      isCompleted: !!studentResults[p.id]
    })));
  }, []);

  const openExamWindow = (paperId) => {
    const url = window.location.origin + '/exam?testId=' + paperId;
    const features = 'width=1400,height=900,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes';
    window.open(url, 'JEE Exam Environment', features);
  };

  return (
    <div className="space-y-6 animate-fade">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/5">
              <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>Latest Test Score</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </div>
              </div>
              <div className="text-2xl font-bold font-mono" style={{color: 'var(--text-primary)'}}>{stats.latestScore}<span className="text-base font-normal" style={{color: 'var(--text-tertiary)'}}>/300</span></div>
              <div className={`mt-1 text-xs font-medium flex items-center gap-1 ${stats.scoreDiff >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={stats.scoreDiff >= 0 ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6"}/></svg>
                  {stats.scoreDiff >= 0 ? `+${stats.scoreDiff}` : stats.scoreDiff} from previous
              </div>
          </div>

          <div className="card rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/5">
              <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>Accuracy</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </div>
              </div>
              <div className="text-2xl font-bold font-mono" style={{color: 'var(--text-primary)'}}>{stats.accuracy}</div>
              <div className="mt-1 text-xs" style={{color: 'var(--text-tertiary)'}}>Overall average</div>
          </div>

          <div className="card rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/5">
              <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>Tests Given</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  </div>
              </div>
              <div className="text-2xl font-bold font-mono" style={{color: 'var(--text-primary)'}}>{stats.testsLast7Days}</div>
              <div className="mt-1 text-xs font-medium text-amber-500 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                  Keep consistent!
              </div>
          </div>

          <div className="card rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/5">
              <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>JEE Mains In</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </div>
              </div>
              <div className="text-2xl font-bold font-mono" style={{color: 'var(--text-primary)'}}>235<span className="text-base font-normal" style={{color: 'var(--text-tertiary)'}}> days</span></div>
              <div className="mt-1 text-xs" style={{color: 'var(--text-tertiary)'}}>Target: Jan 1, 2027</div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card rounded-xl p-6">
              <h3 className="text-base font-semibold mb-6" style={{color: 'var(--text-primary)'}}>Subject Mastery</h3>
              <div className="space-y-6">
                  <div className="flex items-center gap-4">
                      <div className="relative w-14 h-14 flex-shrink-0">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                              <path className="text-slate-200 dark:text-slate-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"/>
                              <path className="text-blue-500" strokeDasharray={`${stats.mathMastery}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"/>
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold font-mono text-blue-500">{stats.mathMastery}%</span>
                      </div>
                      <div className="flex-1 min-w-0">
                          <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium truncate" style={{color: 'var(--text-primary)'}}>Mathematics</span>
                              <span className="text-xs font-mono text-blue-500">{stats.mathMastery}%</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{backgroundColor: 'var(--bg-tertiary)'}}>
                              <div className="h-full bg-blue-500 rounded-full" style={{width: `${stats.mathMastery}%`}}></div>
                          </div>
                      </div>
                  </div>
                  <div className="flex items-center gap-4">
                      <div className="relative w-14 h-14 flex-shrink-0">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                              <path className="text-slate-200 dark:text-slate-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"/>
                              <path className="text-indigo-500" strokeDasharray={`${stats.phyMastery}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"/>
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold font-mono text-indigo-500">{stats.phyMastery}%</span>
                      </div>
                      <div className="flex-1 min-w-0">
                          <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium truncate" style={{color: 'var(--text-primary)'}}>Physics</span>
                              <span className="text-xs font-mono text-indigo-500">{stats.phyMastery}%</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{backgroundColor: 'var(--bg-tertiary)'}}>
                              <div className="h-full bg-indigo-500 rounded-full" style={{width: `${stats.phyMastery}%`}}></div>
                          </div>
                      </div>
                  </div>
                  <div className="flex items-center gap-4">
                      <div className="relative w-14 h-14 flex-shrink-0">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                              <path className="text-slate-200 dark:text-slate-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"/>
                              <path className="text-sky-500" strokeDasharray={`${stats.chemMastery}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"/>
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold font-mono text-sky-500">{stats.chemMastery}%</span>
                      </div>
                      <div className="flex-1 min-w-0">
                          <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium truncate" style={{color: 'var(--text-primary)'}}>Chemistry</span>
                              <span className="text-xs font-mono text-sky-500">{stats.chemMastery}%</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{backgroundColor: 'var(--bg-tertiary)'}}>
                              <div className="h-full bg-sky-500 rounded-full" style={{width: `${stats.chemMastery}%`}}></div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>

          <div className="lg:col-span-2 card rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold" style={{color: 'var(--text-primary)'}}>Available AI Tests</h3>
              </div>
              <div className="space-y-2">
                  {papers.map((paper, idx) => (
                    <div key={paper.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center flex-shrink-0">
                            <Sparkles className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h4 className="text-sm font-semibold truncate" style={{color: 'var(--text-primary)'}}>{paper.title}</h4>
                                {paper.isCompleted && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">Completed</span>}
                            </div>
                            <p className="text-xs mt-0.5" style={{color: 'var(--text-tertiary)'}}>{paper.questions} Qs · {paper.duration}</p>
                        </div>
                        <div className="hidden sm:flex items-center gap-6 text-xs">
                            {paper.isCompleted ? (
                              <button onClick={() => navigate(`/analysis?testId=${paper.id}`)} className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-slate-100 dark:hover:bg-slate-800" style={{borderColor: 'var(--border-color)', color: 'var(--text-secondary)'}}>Review Test</button>
                            ) : (
                              <button onClick={() => openExamWindow(paper.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1"><Play className="w-3 h-3" /> Attempt</button>
                            )}
                        </div>
                    </div>
                  ))}
                  {papers.length === 0 && (
                    <div className="text-center p-6 border border-dashed rounded-xl border-slate-300 dark:border-slate-700">
                      <p className="text-sm text-slate-500 dark:text-slate-400">No Custom AI Tests Available.</p>
                    </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
}

export default Dashboard;

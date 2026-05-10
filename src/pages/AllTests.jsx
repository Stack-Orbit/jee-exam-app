import { useEffect, useState } from 'react';
import { Play, Clock, FileText, ChevronRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../dashboard.css';

function AllTests() {
  const navigate = useNavigate();
  const [papers, setPapers] = useState([]);

  useEffect(() => {
    // Load AI Generated papers from local storage
    const aiTests = JSON.parse(localStorage.getItem('jee_ai_tests') || '[]');
    
    const formattedAiTests = aiTests.map(test => {
      const totalQuestions = test.sections ? test.sections.reduce((acc, sec) => acc + (sec.questions?.length || 0), 0) : 
                           (test.questions ? test.questions.length : 0);
      return {
        id: test.id,
        type: 'AI GENERATED',
        year: 'New',
        title: test.testName || 'AI Custom Test',
        questions: totalQuestions,
        duration: '180 mins',
        isAi: true
      };
    });

    const studentResults = JSON.parse(localStorage.getItem('jee_student_results') || '{}');
    
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
      <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold" style={{color: 'var(--text-primary)'}}>Available Test Papers</h3>
      </div>
      
      {/* Container simulating dashboard-mode so dashboard.css applies correctly without changing body class */}
      <div className="dashboard-container" style={{ background: 'transparent', height: 'auto', minHeight: 'auto', padding: 0 }}>
        <div className="papers-grid">
          {papers.map((paper) => (
            <div key={paper.id} className="paper-card" style={paper.isAi ? { border: '1px solid #c084fc', boxShadow: '0 0 15px rgba(192, 132, 252, 0.1)' } : {}}>
              <div className="card-header">
                <span className="paper-badge" style={paper.isAi ? { background: 'rgba(192, 132, 252, 0.1)', color: '#c084fc' } : {}}>
                  {paper.isAi && <Sparkles size={12} style={{ marginRight: '4px' }} />}
                  {paper.type}
                </span>
                <span className="paper-year" style={{ color: 'var(--text-tertiary)' }}>{paper.year}</span>
              </div>
              
              <h3 className="paper-title">{paper.title}</h3>
              
              <div className="paper-meta">
                <div className="meta-item">
                  <FileText size={16} />
                  <span>{paper.questions} Qs</span>
                </div>
                <div className="meta-item">
                  <Clock size={16} />
                  <span>{paper.duration}</span>
                </div>
              </div>

              {paper.isCompleted ? (
                <button className="start-btn" onClick={() => navigate(`/analysis?testId=${paper.id}`)} style={{ background: 'rgba(52, 211, 153, 0.1)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                  <Sparkles fill="currentColor" size={18} />
                  Review Test
                  <ChevronRight size={20} style={{ position: 'absolute', right: '15px', opacity: 0.5 }} />
                </button>
              ) : (
                <button className="start-btn" onClick={() => openExamWindow(paper.id)} style={paper.isAi ? { background: 'rgba(192, 132, 252, 0.1)', color: '#c084fc' } : {}}>
                  <Play fill="currentColor" size={18} />
                  Start Test
                  <ChevronRight size={20} style={{ position: 'absolute', right: '15px', opacity: 0.5 }} />
                </button>
              )}
            </div>
          ))}
          {papers.length === 0 && (
            <div className="col-span-full text-center p-8 border border-dashed rounded-xl border-slate-300 dark:border-slate-700">
              <p className="text-slate-500 dark:text-slate-400">No Custom AI Tests Available.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AllTests;

import { Users, Activity, FileSpreadsheet } from 'lucide-react';

import { useState, useEffect } from 'react';

function AdminDashboard() {
  const [testsList, setTestsList] = useState([]);
  const [stats, setStats] = useState([
    { title: 'Total Accounts', value: '0', icon: <Users size={24} color="#60a5fa" />, trend: 'System live' },
    { title: 'Active Students', value: '0', icon: <Activity size={24} color="#34d399" />, trend: 'Live right now' },
    { title: 'Tests Generated', value: '0', icon: <FileSpreadsheet size={24} color="#c084fc" />, trend: 'Ready' }
  ]);

  useEffect(() => {
    const users = JSON.parse(localStorage.getItem('airlab_registered_users') || '[]');
    const tests = JSON.parse(localStorage.getItem('jee_ai_tests') || '[]');
    setTestsList(tests);
    
    setStats([
      { title: 'Total Accounts', value: users.length.toString(), icon: <Users size={24} color="#60a5fa" />, trend: 'All registered users' },
      { title: 'Active Students', value: users.filter(u => u.status === 'Active').length.toString(), icon: <Activity size={24} color="#34d399" />, trend: 'Currently active' },
      { title: 'Tests Generated', value: tests.length.toString(), icon: <FileSpreadsheet size={24} color="#c084fc" />, trend: 'AI generated papers' }
    ]);
  }, []);

  const handleDeleteTest = (testId) => {
    if (window.confirm('Are you sure you want to delete this test? It will be removed from all student dashboards.')) {
      const updatedTests = testsList.filter(t => t.id !== testId);
      localStorage.setItem('jee_ai_tests', JSON.stringify(updatedTests));
      setTestsList(updatedTests);
      setStats(prev => prev.map(s => s.title === 'Tests Generated' ? { ...s, value: updatedTests.length.toString() } : s));
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '30px' }}>Dashboard Overview</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        {stats.map(stat => (
          <div key={stat.title} style={{ 
            backgroundColor: 'var(--dash-surface)', 
            padding: '24px', 
            borderRadius: '16px', 
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
              <div>
                <p style={{ color: 'var(--dash-text-muted)', fontSize: '0.9rem', marginBottom: '5px' }}>{stat.title}</p>
                <h3 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{stat.value}</h3>
              </div>
              <div style={{ padding: '10px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                {stat.icon}
              </div>
            </div>
            <p style={{ color: 'var(--dash-text-muted)', fontSize: '0.85rem', margin: 0 }}>{stat.trend}</p>
          </div>
        ))}
      </div>

      <div style={{ backgroundColor: 'var(--dash-surface)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>Manage Generated Tests</h2>
        {testsList.length === 0 ? (
          <p style={{ color: 'var(--dash-text-muted)' }}>No tests generated yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '12px 10px', color: 'var(--dash-text-muted)', fontWeight: 'normal' }}>Test Name</th>
                  <th style={{ padding: '12px 10px', color: 'var(--dash-text-muted)', fontWeight: 'normal' }}>Questions</th>
                  <th style={{ padding: '12px 10px', color: 'var(--dash-text-muted)', fontWeight: 'normal' }}>Date Generated</th>
                  <th style={{ padding: '12px 10px', color: 'var(--dash-text-muted)', fontWeight: 'normal' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {testsList.map(test => {
                  const qCount = test.sections ? test.sections.reduce((acc, sec) => acc + (sec.questions?.length || 0), 0) : 0;
                  const dateStr = test.createdAt ? new Date(test.createdAt).toLocaleDateString() : 'Unknown';
                  return (
                    <tr key={test.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '15px 10px', fontWeight: 'bold' }}>{test.testName}</td>
                      <td style={{ padding: '15px 10px', color: 'var(--dash-text-muted)' }}>{qCount}</td>
                      <td style={{ padding: '15px 10px', color: 'var(--dash-text-muted)' }}>{dateStr}</td>
                      <td style={{ padding: '15px 10px' }}>
                        <button 
                          onClick={() => handleDeleteTest(test.id)}
                          style={{ padding: '6px 12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem' }}
                        >
                          Delete Test
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;

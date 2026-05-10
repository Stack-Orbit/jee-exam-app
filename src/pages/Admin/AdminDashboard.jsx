import { Users, Activity, FileSpreadsheet } from 'lucide-react';

function AdminDashboard() {
  const stats = [
    { title: 'Total Accounts', value: '1,248', icon: <Users size={24} color="#60a5fa" />, trend: '+12% this week' },
    { title: 'Active Students', value: '342', icon: <Activity size={24} color="#34d399" />, trend: 'Live right now' },
    { title: 'Tests Generated', value: '56', icon: <FileSpreadsheet size={24} color="#c084fc" />, trend: '+3 today' }
  ];

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
        <h2 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>Recent Activity</h2>
        <p style={{ color: 'var(--dash-text-muted)' }}>System monitoring active. No critical alerts.</p>
      </div>
    </div>
  );
}

export default AdminDashboard;

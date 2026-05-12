import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, FileSignature, LogOut, Wand2, Settings } from 'lucide-react';
import '../../dashboard.css';

function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('jee_admin_auth');
    navigate('/');
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={20} /> },
    { name: 'Accounts', path: '/admin/accounts', icon: <Users size={20} /> },
    { name: 'AI Test Generator', path: '/admin/ai-generator', icon: <FileSignature size={20} /> },
    { name: 'AI Test Generator II', path: '/admin/ai-generator-2', icon: <Wand2 size={20} /> },
    { name: 'Edit Tests', path: '/admin/edit-tests', icon: <Settings size={20} /> },
  ];

  return (
    <div className="admin-container" style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--dash-bg)', color: 'var(--dash-text)' }}>
      {/* Sidebar */}
      <aside style={{ width: '260px', backgroundColor: 'var(--dash-surface)', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '20px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '40px', background: 'linear-gradient(135deg, #60a5fa, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Admin Portal
        </h2>
        
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {navItems.map(item => (
            <Link 
              key={item.name} 
              to={item.path} 
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px',
                textDecoration: 'none',
                color: location.pathname === item.path ? '#fff' : 'var(--dash-text-muted)',
                backgroundColor: location.pathname === item.path ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                border: location.pathname === item.path ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                transition: 'all 0.2s'
              }}
            >
              {item.icon}
              <span style={{ fontWeight: 500 }}>{item.name}</span>
            </Link>
          ))}
        </nav>

        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'none', border: 'none', color: '#ef4444', marginTop: 'auto', cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit', borderRadius: '10px', width: '100%' }}>
          <LogOut size={20} />
          <span style={{ fontWeight: 500 }}>Exit Admin</span>
        </button>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User } from 'lucide-react';

function AdminLogin() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (userId === 'admin' && password === 'topperboy') {
      localStorage.setItem('jee_admin_auth', 'true');
      navigate('/admin');
    } else {
      setError('Invalid User ID or Password');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', fontFamily: 'Outfit, sans-serif' }}>
      <div style={{ backgroundColor: '#1e293b', padding: '40px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', width: '100%', maxWidth: '420px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
        <div style={{ textAlign: 'center', marginBottom: '35px' }}>
          <div style={{ width: '70px', height: '70px', borderRadius: '20px', backgroundColor: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <Lock size={32} color="#3b82f6" />
          </div>
          <h1 style={{ fontSize: '2rem', color: '#f8fafc', margin: 0, fontWeight: 800 }}>Admin Portal</h1>
          <p style={{ color: '#94a3b8', marginTop: '8px' }}>Secure access for platform managers</p>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '12px', borderRadius: '12px', marginBottom: '20px', textAlign: 'center', fontSize: '0.95rem', fontWeight: '500', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '10px', fontSize: '0.95rem', fontWeight: 500 }}>User ID</label>
            <div style={{ position: 'relative' }}>
              <User size={20} color="#64748b" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                style={{ width: '100%', padding: '14px 14px 14px 48px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', color: 'white', outline: 'none', fontSize: '1rem', transition: 'border-color 0.3s' }}
                placeholder="Enter User ID"
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#334155'}
                required
              />
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '10px', fontSize: '0.95rem', fontWeight: 500 }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={20} color="#64748b" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '14px 14px 14px 48px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', color: 'white', outline: 'none', fontSize: '1rem', transition: 'border-color 0.3s' }}
                placeholder="Enter password"
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#334155'}
                required
              />
            </div>
          </div>
          
          <button 
            type="submit"
            style={{ marginTop: '10px', padding: '16px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)' }}
            onMouseOver={(e) => e.target.style.transform = 'scale(1.02)'}
            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
          >
            Access Dashboard
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminLogin;

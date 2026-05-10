import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, ChevronRight } from 'lucide-react';

function StudentLogin() {
  const [name, setName] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (name.trim()) {
      login({ name: name, email: `${name.toLowerCase().replace(/\s+/g, '')}@student.com`, role: 'student' });
      navigate('/dashboard');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', fontFamily: 'Outfit, sans-serif' }}>
      <div style={{ backgroundColor: '#ffffff', padding: '40px', borderRadius: '24px', border: '1px solid #e2e8f0', width: '100%', maxWidth: '420px', boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: '35px' }}>
          <div style={{ width: '70px', height: '70px', borderRadius: '20px', backgroundColor: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
            <User size={32} color="#3b82f6" />
          </div>
          <h1 style={{ fontSize: '2rem', color: '#0f172a', margin: 0, fontWeight: 800 }}>Student Login</h1>
          <p style={{ color: '#64748b', marginTop: '8px' }}>Enter your name to access the test portal</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <label style={{ display: 'block', color: '#475569', marginBottom: '10px', fontSize: '0.95rem', fontWeight: 600 }}>Full Name</label>
            <div style={{ position: 'relative' }}>
              <User size={20} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%', padding: '14px 14px 14px 48px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', color: '#0f172a', outline: 'none', fontSize: '1rem', transition: 'border-color 0.3s' }}
                placeholder="e.g. Rahul Kumar"
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                required
              />
            </div>
          </div>
          
          <button 
            type="submit"
            style={{ marginTop: '10px', padding: '16px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', transition: 'transform 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)' }}
            onMouseOver={(e) => e.target.style.transform = 'scale(1.02)'}
            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
          >
            Enter Dashboard <ChevronRight size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}

export default StudentLogin;

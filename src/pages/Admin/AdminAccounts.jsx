import React, { useState } from 'react';
import { Users, UserPlus, Trash2, Activity, Award, FileText, ChevronRight, X } from 'lucide-react';

function AdminAccounts() {
  const [users, setUsers] = useState([
    { id: 1, name: 'Rahul Sharma', email: 'rahul@example.com', status: 'Active', testsGiven: 12, avgScore: '85%', joinDate: '2025-01-15' },
    { id: 2, name: 'Priya Patel', email: 'priya@example.com', status: 'Offline', testsGiven: 8, avgScore: '72%', joinDate: '2025-02-02' },
    { id: 3, name: 'Amit Kumar', email: 'amit@example.com', status: 'Active', testsGiven: 15, avgScore: '91%', joinDate: '2024-11-20' },
    { id: 4, name: 'Neha Gupta', email: 'neha@example.com', status: 'Active', testsGiven: 5, avgScore: '65%', joinDate: '2025-03-10' },
  ]);

  const [selectedUser, setSelectedUser] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUserData, setNewUserData] = useState({ name: '', email: '' });

  const activeUsers = users.filter(u => u.status === 'Active').length;

  const handleAddUser = (e) => {
    e.preventDefault();
    if (newUserData.name && newUserData.email) {
      setUsers([...users, {
        id: Date.now(),
        name: newUserData.name,
        email: newUserData.email,
        status: 'Offline',
        testsGiven: 0,
        avgScore: 'N/A',
        joinDate: new Date().toISOString().split('T')[0]
      }]);
      setShowAddModal(false);
      setNewUserData({ name: '', email: '' });
    }
  };

  const handleRemoveUser = (id, e) => {
    e.stopPropagation();
    if(window.confirm('Are you sure you want to remove this account?')) {
      setUsers(users.filter(u => u.id !== id));
      if(selectedUser && selectedUser.id === id) setSelectedUser(null);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Account Management</h1>
        <button 
          onClick={() => setShowAddModal(true)}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', 
            padding: '10px 20px', borderRadius: '10px', 
            backgroundColor: '#3b82f6', color: 'white', 
            border: 'none', cursor: 'pointer', fontWeight: 600,
            transition: 'background-color 0.2s'
          }}
        >
          <UserPlus size={18} />
          Add Account
        </button>
      </div>
      
      {/* Top Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <div style={{ backgroundColor: 'var(--dash-surface)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ padding: '15px', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px' }}>
            <Users size={28} color="#60a5fa" />
          </div>
          <div>
            <p style={{ color: 'var(--dash-text-muted)', fontSize: '0.9rem', marginBottom: '5px' }}>Total Accounts</p>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: 0 }}>{users.length}</h3>
          </div>
        </div>
        <div style={{ backgroundColor: 'var(--dash-surface)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ padding: '15px', backgroundColor: 'rgba(52, 211, 153, 0.1)', borderRadius: '12px' }}>
            <Activity size={28} color="#34d399" />
          </div>
          <div>
            <p style={{ color: 'var(--dash-text-muted)', fontSize: '0.9rem', marginBottom: '5px' }}>Active Now</p>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: 0 }}>{activeUsers}</h3>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '30px' }}>
        {/* User List */}
        <div style={{ flex: selectedUser ? '1' : '100%', transition: 'all 0.3s' }}>
          <div style={{ backgroundColor: 'var(--dash-surface)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Student Directory</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {users.map(user => (
                <div 
                  key={user.id} 
                  onClick={() => setSelectedUser(user)}
                  style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                    padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                    cursor: 'pointer', backgroundColor: selectedUser?.id === user.id ? 'rgba(255,255,255,0.02)' : 'transparent',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = selectedUser?.id === user.id ? 'rgba(255,255,255,0.02)' : 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#4b5563', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem' }}>{user.name}</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--dash-text-muted)' }}>{user.email}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600,
                      backgroundColor: user.status === 'Active' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(156, 163, 175, 0.1)',
                      color: user.status === 'Active' ? '#34d399' : '#9ca3af'
                    }}>
                      {user.status}
                    </span>
                    <button 
                      onClick={(e) => handleRemoveUser(user.id, e)}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '5px' }}
                      title="Remove Account"
                    >
                      <Trash2 size={18} />
                    </button>
                    <ChevronRight size={20} color="var(--dash-text-muted)" />
                  </div>
                </div>
              ))}
              {users.length === 0 && (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--dash-text-muted)' }}>No accounts found.</div>
              )}
            </div>
          </div>
        </div>

        {/* User Profile View */}
        {selectedUser && (
          <div style={{ width: '400px', backgroundColor: 'var(--dash-surface)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.8rem' }}>
                  {selectedUser.name.charAt(0)}
                </div>
                <div>
                  <h2 style={{ margin: '0 0 5px 0', fontSize: '1.4rem' }}>{selectedUser.name}</h2>
                  <p style={{ margin: 0, color: 'var(--dash-text-muted)' }}>{selectedUser.email}</p>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} style={{ background: 'none', border: 'none', color: 'var(--dash-text-muted)', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px' }}>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--dash-text-muted)', marginBottom: '8px' }}>
                  <FileText size={16} />
                  <span style={{ fontSize: '0.9rem' }}>Tests Given</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{selectedUser.testsGiven}</div>
              </div>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--dash-text-muted)', marginBottom: '8px' }}>
                  <Award size={16} />
                  <span style={{ fontSize: '0.9rem' }}>Avg. Score</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#34d399' }}>{selectedUser.avgScore}</div>
              </div>
            </div>

            <h3 style={{ fontSize: '1.1rem', marginBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>Detailed Analytics</h3>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.9rem' }}>
                  <span>Physics</span>
                  <span>78%</span>
                </div>
                <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '78%', backgroundColor: '#60a5fa' }}></div>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.9rem' }}>
                  <span>Chemistry</span>
                  <span>82%</span>
                </div>
                <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '82%', backgroundColor: '#c084fc' }}></div>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.9rem' }}>
                  <span>Mathematics</span>
                  <span>65%</span>
                </div>
                <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '65%', backgroundColor: '#f43f5e' }}></div>
                </div>
              </div>
              
              <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--dash-text-muted)', margin: 0 }}>Joined on: {new Date(selectedUser.joinDate).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'var(--dash-surface)', padding: '30px', borderRadius: '16px', width: '400px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Add New Account</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: 'var(--dash-text-muted)', cursor: 'pointer' }}><X size={20}/></button>
            </div>
            <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: 'var(--dash-text-muted)' }}>Full Name</label>
                <input 
                  type="text" 
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({...newUserData, name: e.target.value})}
                  required
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.2)', color: 'white', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: 'var(--dash-text-muted)' }}>Email Address</label>
                <input 
                  type="email" 
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                  required
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.2)', color: 'white', boxSizing: 'border-box' }}
                />
              </div>
              <button type="submit" style={{ padding: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', marginTop: '10px' }}>
                Create Account
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminAccounts;

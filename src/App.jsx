import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import StudentLayout from './components/StudentLayout';
import Dashboard from './pages/Dashboard';
import AllTests from './pages/AllTests';
import Exam from './pages/Exam';
import Analysis from './pages/Analysis';
import AdminLayout from './pages/Admin/AdminLayout';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminAccounts from './pages/Admin/AdminAccounts';
import AITestGenerator from './pages/Admin/AITestGenerator';
import AITestGeneratorII from './pages/Admin/AITestGeneratorII';
import AdminLogin from './pages/Admin/AdminLogin';
import StudentLogin from './pages/StudentLogin';

function ProtectedAdminRoute({ children }) {
  const isAdmin = localStorage.getItem('jee_admin_auth') === 'true';
  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}

function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  
  if (!currentUser) {
    window.location.href = "/landing/";
    return null;
  }
  
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ProtectedRoute><StudentLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="tests" element={<AllTests />} />
            <Route path="analysis" element={<Analysis />} />
          </Route>
          
          <Route path="/exam" element={<ProtectedRoute><Exam /></ProtectedRoute>} />
        
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<ProtectedAdminRoute><AdminLayout /></ProtectedAdminRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="accounts" element={<AdminAccounts />} />
          <Route path="ai-generator" element={<AITestGenerator />} />
          <Route path="ai-generator-2" element={<AITestGeneratorII />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

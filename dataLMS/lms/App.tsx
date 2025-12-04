
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { Layout } from './components/Layout';
import { AuthPage } from './pages/Auth.tsx';
import { Dashboard } from './pages/Dashboard';
import { Assignments } from './pages/Assignments';
import { Classes } from './pages/Classes';
import { QuestionBank } from './pages/QuestionBank';
import { Ranking } from './pages/Ranking';
import { Competition } from './pages/Competition';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center text-blue-600">Loading...</div>;
  return user ? <Layout>{children}</Layout> : <Navigate to="/login" />;
};

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex h-screen items-center justify-center text-blue-600 font-bold">EduBattle Loading...</div>;

  return (
    <Routes>
      <Route path="/login" element={!user ? <AuthPage /> : <Navigate to="/" />} />
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/assignments" element={<PrivateRoute><Assignments /></PrivateRoute>} />
      <Route path="/classes" element={<PrivateRoute><Classes /></PrivateRoute>} />
      <Route path="/competition" element={<PrivateRoute><Competition /></PrivateRoute>} />
      <Route path="/ranking" element={<PrivateRoute><Ranking /></PrivateRoute>} />
      <Route path="/question_bank" element={<PrivateRoute><QuestionBank /></PrivateRoute>} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <AuthProvider>
        <DataProvider>
          <AppContent />
        </DataProvider>
      </AuthProvider>
    </HashRouter>
  );
};

export default App;

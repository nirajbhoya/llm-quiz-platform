import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './components/auth/Login';
import Register from './components/auth/Register';

// Student pages
import StudentDashboard from './pages/student/StudentDashboard';
import LearningMode from './pages/student/LearningMode';
import ContestsPage from './pages/student/ContestsPage';
import AnalyticsPage from './pages/student/AnalyticsPage';
import SubmissionsPage from './pages/student/SubmissionsPage';
import StudentSubmissionDetails from './pages/student/StudentSubmissionDetails';
import QuizPage from './pages/student/QuizPage';
import TakeContest from './pages/student/TakeContest';
import StudentContestDetails from './pages/student/StudentContestDetails';
import DoubtSessionPage from './pages/student/DoubtSessionPage'; // AI Doubt Session

import CommunityDoubtPage from './pages/student/CommunityDoubtPage';
import CommunityDoubtDetails from './pages/student/CommunityDoubtDetails';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import CreateContest from './pages/admin/CreateContest';
import ContestManagement from './pages/admin/ContestManagement';
import StudentInformation from './pages/admin/StudentInformation';
import ContestOverview from './pages/admin/ContestOverview';
import DoubtManagement from './pages/admin/DoubtManagement';


// Parent pages
import ParentDashboard from './pages/parent/ParentDashboard';
import Home from './pages/Home';
import About from './pages/About';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Student Routes */}
      <Route
        path="/student/dashboard"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <Layout>
              <StudentDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/learning"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <Layout>
              <LearningMode />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/contests"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <Layout>
              <ContestsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/contests/:id"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <Layout>
              <StudentContestDetails />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/contests/:id/take"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <TakeContest />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/analytics"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <Layout>
              <AnalyticsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/submissions"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <Layout>
              <SubmissionsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/submissions/:id"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <Layout>
              <StudentSubmissionDetails />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/quiz/:quizId"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <QuizPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/doubt-session"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <Layout>
              <DoubtSessionPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/community-doubts"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <Layout>
              <CommunityDoubtPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/community-doubts/:id"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <Layout>
              <CommunityDoubtDetails />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Layout>
              <AdminDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/contests"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Layout>
              <AdminDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/students"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Layout>
              <StudentInformation />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/doubt-management"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Layout>
              <DoubtManagement />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/contests/:id/overview"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Layout>
              <ContestOverview />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/contests/create"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Layout>
              <CreateContest />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/contests/:id"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Layout>
              <ContestManagement />
            </Layout>
          </ProtectedRoute>
        }
      />


      {/* Parent Routes */}
      <Route
        path="/parent/dashboard"
        element={
          <ProtectedRoute allowedRoles={['parent']}>
            <Layout>
              <ParentDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;

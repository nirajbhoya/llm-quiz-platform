import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/auth.service';
import { boardsService, type Board } from '../../services/boards.service';
import type { AuthResponse } from '../../services/auth.service';

export default function Register() {
  const [role] = useState<'student' | 'admin'>('student');
  const [boards, setBoards] = useState<Board[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    boardCode: '',
    standard: '',
    gender: '',
    parentName: '',
    parentEmail: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBoards = async () => {
      try {
        const data = await boardsService.getBoards();
        setBoards(data);
      } catch (err) {
        console.error('Failed to load boards', err);
      }
    };
    fetchBoards();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      let response: AuthResponse | null = null;
      if (role === 'student') {
        response = await authService.registerStudent({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          boardCode: formData.boardCode,
          standard: parseInt(formData.standard, 10),
          gender: formData.gender,
          parentEmail: formData.parentEmail,
          parentName: formData.parentName,
        });
      } else if (role === 'admin') {
        response = await authService.registerAdmin({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        });
      }
      if (response) {
        login(response.token, response.user);
        navigate(`/${role}/dashboard`);
      }
    } catch (err: unknown) {
      const error = err as any;
      setError(error.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-purple-500 selection:text-white overflow-hidden relative flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Starry Background Effect */}
      <div className="fixed inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 pointer-events-none"></div>
      {/* Neon glowing orbs */}
      <div className="fixed top-0 left-0 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none translate-x-1/2 translate-y-1/2"></div>

      <div className="max-w-md w-full space-y-8 relative z-10 bg-gray-900/50 backdrop-blur-xl border border-white/10 p-10 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        <div>
          <h2 className="mt-2 text-center text-4xl font-bold tracking-tight text-white">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Choose your role to get started
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
            <input
              type="text"
              value="Student"
              readOnly
              className="appearance-none relative block w-full px-4 py-3 bg-black/50 border border-gray-700 text-gray-400 rounded-lg focus:outline-none sm:text-sm cursor-not-allowed"
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
              <input
                type="text"
                required
                className="appearance-none relative block w-full px-4 py-3 bg-black/50 border border-gray-700 placeholder-gray-500 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent sm:text-sm transition-all"
                placeholder="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email *</label>
              <input
                type="email"
                required
                className="appearance-none relative block w-full px-4 py-3 bg-black/50 border border-gray-700 placeholder-gray-500 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent sm:text-sm transition-all"
                placeholder="Email address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            {role === 'student' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Parent Name *</label>
                  <input
                    type="text"
                    required
                    className="appearance-none relative block w-full px-4 py-3 bg-black/50 border border-gray-700 placeholder-gray-500 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent sm:text-sm transition-all"
                    placeholder="Parent full name"
                    value={formData.parentName}
                    onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Parent Email *</label>
                  <input
                    type="email"
                    required
                    className="appearance-none relative block w-full px-4 py-3 bg-black/50 border border-gray-700 placeholder-gray-500 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent sm:text-sm transition-all"
                    placeholder="Parent email address"
                    value={formData.parentEmail}
                    onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Education Board *</label>
                  <select
                    required
                    className="appearance-none relative block w-full px-4 py-3 bg-black/50 border border-gray-700 placeholder-gray-500 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent sm:text-sm transition-all"
                    value={formData.boardCode}
                    onChange={(e) => setFormData({ ...formData, boardCode: e.target.value })}
                  >
                    <option value="">Select Board</option>
                    {boards.map((board) => (
                      <option key={board.code} value={board.code}>
                        {board.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Standard/Class *</label>
                  <select
                    required
                    className="appearance-none relative block w-full px-4 py-3 bg-black/50 border border-gray-700 placeholder-gray-500 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent sm:text-sm transition-all"
                    value={formData.standard}
                    onChange={(e) => setFormData({ ...formData, standard: e.target.value })}
                  >
                    <option value="">Select Class</option>
                    {[...Array(12)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        Class {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Password *</label>
              <input
                type="password"
                required
                className="appearance-none relative block w-full px-4 py-3 bg-black/50 border border-gray-700 placeholder-gray-500 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent sm:text-sm transition-all"
                placeholder="Minimum 6 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Confirm Password *</label>
              <input
                type="password"
                required
                className="appearance-none relative block w-full px-4 py-3 bg-black/50 border border-gray-700 placeholder-gray-500 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent sm:text-sm transition-all"
                placeholder="Confirm password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
            </div>

            {role === 'student' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Gender *</label>
                <select
                  required
                  className="appearance-none relative block w-full px-4 py-3 bg-black/50 border border-gray-700 placeholder-gray-500 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent sm:text-sm transition-all"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-lg bg-red-900/30 border border-red-800 p-4">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider shadow-lg shadow-purple-900/30 transition-all transform hover:scale-[1.02]"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-400">
              Already have an account?{' '}
              <a href="/login" className="font-medium text-purple-400 hover:text-purple-300 transition-colors">
                Sign in here
              </a>
            </p>
          </div>
        </form>
      </div >
    </div >
  );
}



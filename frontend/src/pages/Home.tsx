import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Home() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const studentInfo =
        user?.role === 'student'
            ? {
                board: user.boardCode || 'Board',
                standard: user.standard,
            }
            : null;

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-purple-500 selection:text-white overflow-x-hidden relative">
            {/* Starry Background Effect */}
            <div className="fixed inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 pointer-events-none"></div>
            {/* Neon side lines inspired by image */}
            <div className="fixed top-1/2 left-0 w-32 h-[500px] -translate-y-1/2 bg-gradient-to-r from-purple-600/20 to-transparent blur-[50px] pointer-events-none"></div>

            <div className="relative z-10">
                {/* Navbar */}
                <nav className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
                    <div className="text-2xl font-bold tracking-wide text-white">
                        QuizGenius
                    </div>

                    <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-gray-300">
                        <a href="/" className="text-white border-b-2 border-white pb-1">Home</a>
                        <a href="/about" className="hover:text-white transition">About</a>
                        {user && (
                            <Link to={user.role === 'student' ? '/student/dashboard' : user.role === 'admin' ? '/admin/dashboard' : '/parent/dashboard'} className="hover:text-white transition">
                                Dashboard
                            </Link>
                        )}
                    </div>

                    <div className="flex items-center space-x-6 text-sm font-medium">
                        {!user ? (
                            <>
                                <button onClick={() => navigate('/login')} className="text-gray-300 hover:text-white transition">
                                    Login
                                </button>
                                <button
                                    onClick={() => navigate('/register')}
                                    className="bg-white text-black px-6 py-2 rounded shadow hover:bg-gray-100 transition font-bold"
                                >
                                    Sign Up
                                </button>
                            </>
                        ) : (
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsProfileOpen((prev) => !prev)}
                                    className="flex items-center space-x-3 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 rounded-full"
                                >
                                    <div className="h-9 w-9 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-purple-900/20 ring-2 ring-white/10">
                                        {(user.name && user.name.charAt(0).toUpperCase()) || 'S'}
                                    </div>
                                    <div className="hidden sm:flex flex-col items-start text-left">
                                        <span className="text-sm font-medium text-gray-200">
                                            {user.name}
                                        </span>
                                        {studentInfo && (
                                            <span className="text-xs text-gray-400">
                                                {studentInfo.board} • Class {studentInfo.standard ?? '-'}
                                            </span>
                                        )}
                                    </div>
                                </button>

                                {isProfileOpen && (
                                    <div className="origin-top-right absolute right-0 mt-2 w-64 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] bg-gray-900 border border-white/10 ring-1 ring-black ring-opacity-5 focus:outline-none z-50 backdrop-blur-xl">
                                        <div className="px-4 py-3 border-b border-white/10">
                                            <p className="text-sm font-semibold text-white">{user.name}</p>
                                            <p className="text-xs text-gray-400 truncate">{user.email}</p>
                                        </div>
                                        <div className="py-1">
                                            <Link
                                                to={user.role === 'student' ? '/student/dashboard' : user.role === 'admin' ? '/admin/dashboard' : '/parent/dashboard'}
                                                className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
                                            >
                                                Go to Dashboard
                                            </Link>
                                            <button
                                                onClick={handleLogout}
                                                className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900/20"
                                            >
                                                Logout
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </nav>

                <main className="max-w-7xl mx-auto px-6 pt-10 pb-20">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[60vh]">
                        {/* Left Content */}
                        <div className="space-y-8 z-10">
                            <h1 className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight">
                                UNLEASH YOUR <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 animate-gradient-x">
                                    INNER GENIUS
                                </span>
                            </h1>
                            <p className="text-gray-400 text-lg md:text-xl max-w-lg leading-relaxed">
                                Experience the future of learning with AI-driven quizzes, real-time analytics, and a gamified path to mastery.
                            </p>

                            <div className="flex flex-wrap gap-4 pt-4">
                                <button
                                    onClick={() => navigate(user ? '/student/learning' : '/login')}
                                    className="px-8 py-4 rounded-full bg-white text-black font-bold text-lg uppercase tracking-wider hover:bg-gray-200 hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                                >
                                    {user ? 'Start Practicing' : 'Get Started'}
                                </button>
                                {!user && (
                                    <button
                                        onClick={() => navigate('/about')}
                                        className="px-8 py-4 rounded-full border border-gray-600/50 text-gray-300 font-bold text-lg uppercase tracking-wider hover:bg-white/5 hover:border-white hover:text-white transition-all backdrop-blur-sm"
                                    >
                                        Learn More
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Right Content */}
                        <div className="relative flex justify-center lg:justify-end z-10">
                            {/* Main Neon Brain Image */}
                            <div className="relative w-full max-w-lg aspect-square animate-float">
                                <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/30 to-blue-600/30 rounded-full blur-[100px] pointer-events-none"></div>
                                <img
                                    src="/assets/hero-home-quiz.png"
                                    alt="Neon Brain AI"
                                    className="relative w-full h-full object-contain drop-shadow-[0_0_50px_rgba(139,92,246,0.3)]"
                                    style={{ filter: 'brightness(1.1) contrast(1.1)' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Features Section */}
                    <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="group p-8 rounded-2xl bg-gray-900/40 border border-white/5 hover:border-purple-500/50 hover:bg-gray-900/60 transition-all duration-300 backdrop-blur-md">
                            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-6 text-purple-400 group-hover:text-purple-300 group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">AI-Powered Learning</h3>
                            <p className="text-gray-400 leading-relaxed">
                                Adoptive quizzes that evolve with you. Our AI analyzes your strengths and weaknesses to curate the perfect learning path.
                            </p>
                        </div>

                        <div className="group p-8 rounded-2xl bg-gray-900/40 border border-white/5 hover:border-blue-500/50 hover:bg-gray-900/60 transition-all duration-300 backdrop-blur-md">
                            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-6 text-blue-400 group-hover:text-blue-300 group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">Real-Time Analytics</h3>
                            <p className="text-gray-400 leading-relaxed">
                                Visualize your progress with stunning charts. Track accuracy, speed, and topic mastery in real-time.
                            </p>
                        </div>

                        <div className="group p-8 rounded-2xl bg-gray-900/40 border border-white/5 hover:border-pink-500/50 hover:bg-gray-900/60 transition-all duration-300 backdrop-blur-md">
                            <div className="w-12 h-12 rounded-lg bg-pink-500/10 flex items-center justify-center mb-6 text-pink-400 group-hover:text-pink-300 group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">Gamified Mastery</h3>
                            <p className="text-gray-400 leading-relaxed">
                                Compete on leaderboards, earn badges, and turn studying into an addictive game you'll love to win.
                            </p>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

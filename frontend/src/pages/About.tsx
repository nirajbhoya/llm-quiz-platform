import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function About() {
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
            {/* Neon side lines effect */}
            <div className="fixed top-1/2 left-0 w-32 h-[500px] -translate-y-1/2 bg-gradient-to-r from-purple-600/20 to-transparent blur-[50px] pointer-events-none"></div>

            <div className="relative z-10">
                {/* Navbar */}
                <nav className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
                    <div className="text-2xl font-bold tracking-wide text-white cursor-pointer" onClick={() => navigate('/')}>
                        QuizGenius
                    </div>

                    <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-gray-300">
                        <a href="/" className="hover:text-white transition">Home</a>
                        <a href="/about" className="text-white border-b-2 border-white pb-1">About</a>
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

                <main className="max-w-7xl mx-auto px-6 pb-20">
                    {/* Vision Section */}
                    <section className="py-20 border-t border-gray-900 border-none"> {/* Removed top border for clean start */}
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-bold mb-6">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
                                    The Future of Learning
                                </span>
                            </h2>
                            <p className="text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed">
                                We are building an ecosystem where AI meets education. Our platform doesn't just test your knowledge—it evolves with you, providing real-time insights and adaptive challenges.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                { title: 'Information to Intelligence', desc: 'Transforming raw data into actionable learning paths.', color: 'from-purple-500 to-indigo-500' },
                                { title: 'Real-Time Evolution', desc: 'Quizzes that adapt difficulty based on your performance instantly.', color: 'from-cyan-500 to-blue-500' },
                                { title: 'Global Benchmarking', desc: 'Compete with the sharpest minds across the digital landscape.', color: 'from-pink-500 to-rose-500' }
                            ].map((item, idx) => (
                                <div key={idx} className="relative group p-1">
                                    <div className={`absolute inset-0 bg-gradient-to-r ${item.color} opacity-20 blur-xl group-hover:opacity-40 transition duration-500`}></div>
                                    <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-2xl hover:border-white/20 transition h-full">
                                        <h3 className="text-xl font-bold mb-3 text-white">{item.title}</h3>
                                        <p className="text-gray-400 text-sm">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Team Section */}
                    <section className="py-20 border-t border-gray-800">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white">Meet The <span className="text-purple-500">Architects</span></h2>
                            <p className="text-gray-400">The minds behind the machine.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-4xl mx-auto">
                            {[
                                { name: 'Yash Sanandiya', role: 'Backend Developer', gradient: 'from-green-400 to-emerald-500', initial: 'YS' },
                                { name: 'Niraj Bhoya', role: 'Frontend Developer', gradient: 'from-blue-400 to-indigo-500', initial: 'NB' }
                            ].map((member, idx) => (
                                <div key={idx} className="group relative">
                                    <div className={`absolute -inset-0.5 bg-gradient-to-r ${member.gradient} opacity-30 group-hover:opacity-75 blur transition duration-500 rounded-2xl`}></div>
                                    <div className="relative bg-gray-900 rounded-2xl p-6 flex flex-col items-center text-center h-full border border-white/5">
                                        <div className={`w-24 h-24 rounded-full bg-gradient-to-r ${member.gradient} p-1 mb-6 shadow-lg shadow-purple-900/20`}>
                                            <div className="w-full h-full bg-gray-900 rounded-full flex items-center justify-center text-2xl font-bold text-white">
                                                {member.initial}
                                            </div>
                                        </div>
                                        <h3 className="text-2xl font-bold text-white mb-2">{member.name}</h3>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/5 text-gray-300 border border-white/10`}>
                                            {member.role}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
}

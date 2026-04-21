import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { communityDoubtService } from '../../services/community-doubt.service';
import type { CommunityQuestion } from '../../services/community-doubt.service';

function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d ago`;
    return new Date(iso).toLocaleDateString();
}

export default function CommunityDoubtPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [questions, setQuestions] = useState<CommunityQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'list' | 'ask'>('list');
    const [search, setSearch] = useState('');

    // Post form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [images, setImages] = useState<File[]>([]);
    const [posting, setPosting] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadQuestions();
    }, [user]);

    async function loadQuestions() {
        try {
            setLoading(true);
            const data = await communityDoubtService.getQuestions();
            setQuestions(data);
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim() || !description.trim()) return;
        setPosting(true);
        setError('');
        try {
            const formData = new FormData();
            formData.append('title', title.trim());
            formData.append('description', description.trim());
            images.forEach(img => formData.append('images', img));

            const newQuestion = await communityDoubtService.createQuestion(formData);
            setQuestions(prev => [newQuestion, ...prev]);
            setView('list');
            setTitle(''); setDescription(''); setImages([]);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to post question');
        } finally {
            setPosting(false);
        }
    }

    const filtered = questions.filter(q =>
        q.title.toLowerCase().includes(search.toLowerCase()) ||
        q.description.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {user?.isBlockedFromDoubts && (
                <div className="mb-8 p-4 bg-red-900/20 border border-red-500/50 rounded-2xl flex items-center gap-4 text-red-400">
                    <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                        <p className="font-bold">You are currently blocked from the Community.</p>
                        <p className="text-xs opacity-80">You can still browse questions, but cannot post or answer until an admin unblocks you.</p>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Community Doubts</h1>
                    <p className="text-gray-400 mt-1">Stuck somewhere? Ask your peers for help!</p>
                </div>
                {!user?.isBlockedFromDoubts && (
                    <button
                        onClick={() => setView(view === 'list' ? 'ask' : 'list')}
                        className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                    >
                        {view === 'list' ? (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                </svg>
                                Ask a Question
                            </>
                        ) : 'Back to Feed'}
                    </button>
                )}
            </div>

            {view === 'list' ? (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Left Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 p-6 rounded-2xl">
                            <h3 className="text-lg font-bold text-white mb-4">Feed Info</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Total Questions</span>
                                    <span className="text-white font-bold">{questions.length}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Your Grade</span>
                                    <span className="bg-indigo-900/40 text-indigo-300 px-3 py-1 rounded-lg text-xs font-bold border border-indigo-500/30">
                                        Class {user?.standard || 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Feed */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search questions, keywords..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full bg-gray-900/50 border border-white/10 rounded-2xl px-12 py-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                            />
                            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-20">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-500"></div>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 p-20 rounded-3xl text-center">
                                <div className="w-20 h-20 bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">No questions found</h3>
                                <p className="text-gray-400">Be the first to ask something!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filtered.map(q => (
                                    <div
                                        key={q._id}
                                        onClick={() => navigate(`/student/community-doubts/${q._id}`)}
                                        className="group bg-gray-900/50 backdrop-blur-xl border border-white/10 p-6 rounded-2xl hover:bg-white/5 transition-all cursor-pointer flex gap-6"
                                    >
                                        <div className="hidden sm:flex flex-col items-center gap-1">
                                            <div className="bg-indigo-900/20 text-indigo-300 p-2 rounded-xl border border-indigo-500/20 text-center min-w-[64px]">
                                                <div className="text-xl font-black">{q.votes}</div>
                                                <div className="text-[10px] uppercase font-bold tracking-wider">votes</div>
                                            </div>
                                            <div className={`p-2 rounded-xl text-center min-w-[64px] border ${q.answerCount > 0 ? 'bg-green-900/20 text-green-400 border-green-500/20' : 'bg-gray-800 text-gray-500 border-gray-700'}`}>
                                                <div className="text-xl font-black">{q.answerCount}</div>
                                                <div className="text-[10px] uppercase font-bold tracking-wider">answers</div>
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                <span className="bg-indigo-900/40 text-indigo-300 px-2 py-0.5 rounded text-[10px] font-bold border border-indigo-500/30 uppercase">
                                                    Class {q.standard}
                                                </span>
                                                <span className="text-[10px] text-gray-500 self-center uppercase font-bold tracking-wider">
                                                    Asked {timeAgo(q.createdAt)}
                                                </span>
                                            </div>
                                            <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-2 mb-2">
                                                {q.title}
                                            </h3>
                                            <p className="text-gray-400 text-sm line-clamp-2 mb-4">
                                                {q.description}
                                            </p>
                                            <div className="flex items-center gap-2 mt-auto">
                                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white">
                                                    {q.authorId?.name?.charAt(0).toUpperCase() || '?'}
                                                </div>
                                                <span className="text-xs text-gray-400 font-medium">
                                                    {q.authorId?.name || 'Anonymous'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="max-w-3xl mx-auto">
                    <form onSubmit={handleSubmit} className="bg-gray-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl space-y-6">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-extrabold text-white">Post Your Doubt</h2>
                            <p className="text-gray-400">Describe your problem clearly to get better answers.</p>
                        </div>

                        {error && (
                            <div className="bg-red-900/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm italic">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-300 mb-2">Title <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., Why is mitochondria called the powerhouse of the cell?"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder-gray-600"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-300 mb-2">Description <span className="text-red-500">*</span></label>
                                <textarea
                                    required
                                    rows={10}
                                    placeholder="Explain your doubt in detail. What have you tried? Where are you stuck?"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder-gray-600 resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-300 mb-2">Attachments (Optional)</label>
                                <div className="flex flex-wrap gap-4 items-center">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:bg-white/10 transition-all flex items-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        Select Images
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={e => {
                                            const files = Array.from(e.target.files || []);
                                            setImages(prev => [...prev, ...files].slice(0, 3));
                                        }}
                                        multiple
                                        accept="image/*"
                                        className="hidden"
                                    />
                                    <span className="text-xs text-gray-500">Max 3 images. PNG, JPG allowed.</span>
                                </div>
                                {images.length > 0 && (
                                    <div className="flex gap-4 mt-4">
                                        {images.map((img, i) => (
                                            <div key={i} className="relative group w-20 h-20">
                                                <img
                                                    src={URL.createObjectURL(img)}
                                                    alt="preview"
                                                    className="w-full h-full object-cover rounded-lg border border-white/20"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                                                    className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-4 flex gap-4">
                            <button
                                type="submit"
                                disabled={posting || !title.trim() || !description.trim()}
                                className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl font-bold shadow-xl shadow-indigo-500/20 transition-all disabled:opacity-50"
                            >
                                {posting ? 'Posting...' : 'Create Question'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setView('list')}
                                className="px-8 py-4 bg-white/5 border border-white/10 text-gray-300 rounded-2xl font-bold hover:bg-white/10 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

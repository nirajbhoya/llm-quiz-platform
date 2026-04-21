import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

export default function CommunityDoubtDetails() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [question, setQuestion] = useState<CommunityQuestion | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Answer form
    const [answerContent, setAnswerContent] = useState('');
    const [answerImages, setAnswerImages] = useState<File[]>([]);
    const [posting, setPosting] = useState(false);
    const [answerError, setAnswerError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (id) loadQuestion(id);
    }, [id]);

    async function loadQuestion(qid: string) {
        try {
            setLoading(true);
            const data = await communityDoubtService.getQuestion(qid);
            setQuestion(data);
        } catch {
            setError('Question not found');
        } finally {
            setLoading(false);
        }
    }

    async function handleVoteQuestion() {
        if (!question || !user) return;
        try {
            const result = await communityDoubtService.voteQuestion(question._id);
            setQuestion(prev => prev ? {
                ...prev,
                votes: result.votes,
                upvoters: result.isUpvoted
                    ? [...(prev.upvoters || []), user.id]
                    : (prev.upvoters || []).filter(uid => uid !== user.id)
            } : null);
        } catch { /* silent */ }
    }

    async function handleVoteAnswer(answerId: string) {
        if (!user) return;
        try {
            const result = await communityDoubtService.voteAnswer(answerId);
            setQuestion(prev => {
                if (!prev || !prev.answers) return prev;
                const newAnswers = prev.answers.map(a => {
                    // Update the clicked one
                    if (a._id === answerId) {
                        return {
                            ...a,
                            votes: result.votes,
                            upvoters: result.isUpvoted
                                ? [...(a.upvoters || []), user.id]
                                : (a.upvoters || []).filter(uid => uid !== user.id)
                        };
                    }
                    // Handle transferred vote from another answer
                    if (result.transferredFrom && a._id === result.transferredFrom) {
                        return {
                            ...a,
                            votes: Math.max(0, a.votes - 1),
                            upvoters: (a.upvoters || []).filter(uid => uid !== user.id)
                        };
                    }
                    return a;
                }).sort((a, b) => b.votes - a.votes);
                return { ...prev, answers: newAnswers };
            });
        } catch { /* silent */ }
    }

    async function handlePostAnswer(e: React.FormEvent) {
        e.preventDefault();
        if (!id || !answerContent.trim()) return;
        setPosting(true);
        setAnswerError('');
        try {
            const formData = new FormData();
            formData.append('content', answerContent.trim());
            answerImages.forEach(img => formData.append('images', img));

            const newAnswer = await communityDoubtService.postAnswer(id, formData);
            setQuestion(prev => {
                if (!prev) return prev;
                const ans = prev.answers || [];
                return {
                    ...prev,
                    answerCount: prev.answerCount + 1,
                    answers: [...ans, newAnswer].sort((a, b) => b.votes - a.votes)
                };
            });
            setAnswerContent('');
            setAnswerImages([]);
        } catch (err: any) {
            setAnswerError(err.response?.data?.error || 'Failed to post answer');
        } finally {
            setPosting(false);
        }
    }

    if (loading) return (
        <div className="flex justify-center py-40">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-500"></div>
        </div>
    );

    if (error || !question) return (
        <div className="max-w-2xl mx-auto py-20 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Oops!</h2>
            <p className="text-gray-400 mb-8">{error || 'Something went wrong.'}</p>
            <button
                onClick={() => navigate('/student/community-doubts')}
                className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold"
            >
                Back to Feed
            </button>
        </div>
    );

    const bestAnswer = (question.answers && question.answers.length > 0) ? question.answers[0] : null;

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            <button
                onClick={() => navigate('/student/community-doubts')}
                className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Community Feed
            </button>

            {/* Question Section */}
            <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 mb-8">
                <div className="flex gap-8">
                    {/* Votes column */}
                    <div className="flex flex-col items-center gap-2">
                        <button
                            onClick={handleVoteQuestion}
                            className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all font-black text-xl ${user && question.upvoters?.includes(user.id)
                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)]'
                                : 'bg-white/5 border-white/10 text-gray-400 hover:text-indigo-400 hover:bg-white/10'
                                }`}
                        >
                            ▲
                        </button>
                        <span className={`text-2xl font-black ${user && question.upvoters?.includes(user.id) ? 'text-indigo-400' : 'text-white'}`}>
                            {question.votes}
                        </span>
                        <div className="text-[10px] uppercase font-bold text-gray-500 tracking-widest text-center">votes</div>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-3 mb-4 items-center">
                            <span className="bg-indigo-900/40 text-indigo-300 px-3 py-1 rounded-lg text-xs font-bold border border-indigo-500/30 uppercase">
                                Class {question.standard}
                            </span>
                            <span className="text-xs text-gray-500 italic">
                                Asked {timeAgo(question.createdAt)} by <span className="text-indigo-400 font-bold underline cursor-help">{question.authorId?.name || 'User'}</span>
                            </span>
                        </div>
                        <h1 className="text-3xl font-extrabold text-white mb-6 leading-tight">{question.title}</h1>
                        <p className="text-gray-300 text-lg leading-relaxed whitespace-pre-wrap mb-8">{question.description}</p>

                        {question.images && question.images.length > 0 && (
                            <div className="flex flex-wrap gap-4 mb-8">
                                {question.images.map((img, i) => (
                                    <a
                                        key={i}
                                        href={`http://localhost:4000/${img}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="w-full sm:w-1/2 lg:w-1/3"
                                    >
                                        <img
                                            src={`http://localhost:4000/${img}`}
                                            alt={`Img ${i}`}
                                            className="w-full h-auto rounded-2xl border border-white/10 hover:border-indigo-500/50 transition-all cursor-zoom-in"
                                        />
                                    </a>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-6 border-t border-white/5">
                            <span className="text-gray-500 text-sm font-bold flex items-center gap-2">
                                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                {question.answerCount} Answers
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Answers Feed */}
            <div className="space-y-6 mb-12">
                <h3 className="text-xl font-extrabold text-white flex items-center gap-2 mb-4">
                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Student Solutions
                </h3>

                {question.answers && question.answers.length > 0 ? (
                    question.answers.map((ans) => {
                        const isBest = bestAnswer && ans._id === bestAnswer._id && ans.votes > 0;
                        return (
                            <div
                                key={ans._id}
                                className={`relative bg-gray-900/50 backdrop-blur-xl border p-8 rounded-3xl transition-all ${isBest ? 'border-green-500/40 bg-green-500/5 ring-1 ring-green-500/20 shadow-xl shadow-green-500/5' : 'border-white/10'}`}
                            >
                                {isBest && (
                                    <div className="absolute -top-3 left-6 px-3 py-1 bg-green-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-1 shadow-lg">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.64.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                                        </svg>
                                        Most Helpful Answer
                                    </div>
                                )}
                                <div className="flex gap-8">
                                    <div className="flex flex-col items-center gap-2">
                                        <button
                                            onClick={() => handleVoteAnswer(ans._id)}
                                            className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${user && ans.upvoters?.includes(user.id)
                                                ? 'bg-green-600 text-white border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]'
                                                : 'bg-white/5 border-white/10 text-gray-500 hover:text-white hover:bg-white/10'
                                                }`}
                                        >
                                            ▲
                                        </button>
                                        <span className={`text-xl font-black ${user && ans.upvoters?.includes(user.id) ? 'text-green-400' : 'text-gray-300'}`}>{ans.votes}</span>
                                        <div className="text-[9px] uppercase font-bold text-gray-500 tracking-widest text-center">helpful</div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-gray-300 text-lg leading-relaxed whitespace-pre-wrap mb-6">{ans.content}</p>

                                        {ans.images && ans.images.length > 0 && (
                                            <div className="flex flex-wrap gap-4 mb-6">
                                                {ans.images.map((img, i) => (
                                                    <a key={i} href={`http://localhost:4000/${img}`} target="_blank" rel="noreferrer">
                                                        <img
                                                            src={`http://localhost:4000/${img}`}
                                                            alt={`Ans Img ${i}`}
                                                            className="w-full max-w-sm h-auto rounded-2xl border border-white/5"
                                                        />
                                                    </a>
                                                ))}
                                            </div>
                                        )}

                                        <div className="flex justify-end pt-3">
                                            <div className="bg-indigo-900/20 border border-indigo-500/20 p-4 rounded-2xl flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black">
                                                    {ans.authorId?.name?.charAt(0).toUpperCase() || '?'}
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest leading-none mb-1">Answered By</p>
                                                    <p className="text-indigo-300 font-extrabold text-sm">{ans.authorId?.name || 'Fellow Learner'}</p>
                                                    <p className="text-[10px] text-gray-600 font-bold">{timeAgo(ans.createdAt)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="bg-white/5 border border-white/10 p-12 rounded-3xl text-center italic text-gray-400">
                        No answers yet. Share your knowledge and help your fellow student!
                    </div>
                )}
            </div>

            {/* Post Answer Section */}
            {!user?.isBlockedFromDoubts ? (
                <div className="max-w-3xl border-t border-white/10 pt-12">
                    <h3 className="text-2xl font-extrabold text-white mb-6">Provide Your Answer</h3>
                    <form onSubmit={handlePostAnswer} className="bg-gray-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl space-y-6 shadow-2xl">
                        {answerError && <div className="p-4 bg-red-900/20 border border-red-500/50 text-red-400 rounded-xl text-sm italic">{answerError}</div>}
                        <textarea
                            required
                            rows={8}
                            placeholder="Type your explanation here. Use bullet points or numbers for clarity..."
                            value={answerContent}
                            onChange={e => setAnswerContent(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder-gray-600 resize-none leading-relaxed"
                        />

                        <div>
                            <div className="flex items-center gap-4">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-all flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Attach Explanation Image
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={e => setAnswerImages(Array.from(e.target.files || []))}
                                    multiple
                                    accept="image/*"
                                    className="hidden"
                                />
                                {answerImages.length > 0 && <span className="text-xs text-indigo-400 font-bold">{answerImages.length} attached</span>}
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                type="submit"
                                disabled={posting || !answerContent.trim()}
                                className="flex-1 py-4 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white rounded-2xl font-bold shadow-xl shadow-green-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {posting ? 'Submitting...' : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                        Post Solution
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="mt-12 p-8 bg-red-900/10 border border-red-500/20 rounded-3xl text-center">
                    <p className="text-red-400 font-bold">You are restricted from posting answers.</p>
                    <p className="text-gray-500 text-sm">Please contact support or an admin if you believe this is a mistake.</p>
                </div>
            )}
        </div>
    );
}

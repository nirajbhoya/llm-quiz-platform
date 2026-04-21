import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { boardsService } from '../../services/boards.service';
import { doubtSessionService } from '../../services/doubt-session.service';
import type { DoubtSession, DoubtMessage } from '../../services/doubt-session.service';

type View = 'list' | 'detail' | 'ask';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Group flat messages array into Q-A pairs */
function buildQAPairs(messages: DoubtMessage[]) {
    const pairs: { q: DoubtMessage; a: DoubtMessage | null }[] = [];
    let i = 0;
    while (i < messages.length) {
        const q = messages[i];
        const a = messages[i + 1]?.role === 'ai' ? messages[i + 1] : null;
        pairs.push({ q, a });
        i += a ? 2 : 1;
    }
    return pairs;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function DoubtSessionPage() {
    const { user } = useAuth();
    const [view, setView] = useState<View>('list');

    const [sessions, setSessions] = useState<DoubtSession[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(true);
    const [selectedSession, setSelectedSession] = useState<DoubtSession | null>(null);
    const [loadingSession, setLoadingSession] = useState(false);

    const [subjects, setSubjects] = useState<{ name: string }[]>([]);
    const [askTitle, setAskTitle] = useState('');
    const [askBody, setAskBody] = useState('');
    const [askSubject, setAskSubject] = useState('');
    const [askImages, setAskImages] = useState<File[]>([]);
    const [posting, setPosting] = useState(false);

    const imageInputRef = useRef<HTMLInputElement>(null);

    const [followUp, setFollowUp] = useState('');
    const [asking, setAsking] = useState(false);
    const [formError, setFormError] = useState('');
    const [search, setSearch] = useState('');

    const bottomRef = useRef<HTMLDivElement>(null);
    const followUpRef = useRef<HTMLTextAreaElement>(null);

    // Load subjects
    useEffect(() => {
        if (user?.boardCode && user?.standard) {
            boardsService.getSubjects(user.boardCode, user.standard).then(setSubjects).catch(() => { });
        }
    }, [user]);

    useEffect(() => { loadSessions(); }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [selectedSession?.messages?.length, asking]);

    // ── Load sessions list ────────────────────────────────────────────────────
    async function loadSessions() {
        try {
            setLoadingSessions(true);
            const data = await doubtSessionService.getSessions();
            setSessions(data);
        } catch { /* silent */ }
        finally { setLoadingSessions(false); }
    }

    // ── Open a session (full messages) ────────────────────────────────────────
    async function openSession(s: DoubtSession) {
        setView('detail');
        setLoadingSession(true);
        setFormError('');
        try {
            const full = await doubtSessionService.getSession(s._id);
            setSelectedSession(full);
        } catch { setFormError('Failed to load session.'); }
        finally { setLoadingSession(false); }
    }

    // ── Post brand-new question → creates session + first AI answer ───────────
    async function handlePost(e: React.FormEvent) {
        e.preventDefault();
        if (!askTitle.trim() || !askBody.trim()) return;
        setPosting(true);
        setFormError('');
        try {
            const session = await doubtSessionService.createSession({
                title: askTitle.trim(),
                subject: askSubject || undefined,
                boardCode: user?.boardCode,
                standard: user?.standard,
            });
            const result = await doubtSessionService.askQuestion(session._id, askBody.trim(), askImages);
            const full: DoubtSession = { ...session, messages: [result.studentMessage, result.aiMessage] };
            setSessions(prev => [{ ...session, messageCount: 2 }, ...prev]);
            setSelectedSession(full);
            setAskTitle(''); setAskBody(''); setAskSubject(''); setAskImages([]);
            setView('detail');
        } catch (err: any) {
            setFormError(err?.response?.data?.error || 'Failed to post question.');
        } finally { setPosting(false); }
    }

    // ── Follow-up inside a session ────────────────────────────────────────────
    async function handleFollowUp(e: React.FormEvent) {
        e.preventDefault();
        if (!followUp.trim() || !selectedSession || asking) return;
        const q = followUp.trim();
        setFollowUp('');
        setAsking(true);
        setFormError('');

        // Optimistic student message
        const optimistic: DoubtMessage = { role: 'student', content: q, createdAt: new Date().toISOString() };
        setSelectedSession(prev => prev ? { ...prev, messages: [...prev.messages, optimistic] } : prev);

        try {
            const result = await doubtSessionService.askQuestion(selectedSession._id, q);
            setSelectedSession(prev => {
                if (!prev) return prev;
                return { ...prev, messages: [...prev.messages.slice(0, -1), result.studentMessage, result.aiMessage] };
            });
            setSessions(prev =>
                prev.map(s => s._id === selectedSession._id
                    ? { ...s, messageCount: result.totalMessages, updatedAt: new Date().toISOString() }
                    : s)
            );
        } catch (err: any) {
            setFormError(err?.response?.data?.error || 'Failed to get answer.');
            setSelectedSession(prev => prev ? { ...prev, messages: prev.messages.slice(0, -1) } : prev);
        } finally {
            setAsking(false);
            followUpRef.current?.focus();
        }
    }

    // ── Delete session ────────────────────────────────────────────────────────
    async function handleDelete(id: string, e: React.MouseEvent) {
        e.stopPropagation();
        if (!window.confirm('Delete this question and all its answers?')) return;
        try {
            await doubtSessionService.deleteSession(id);
            setSessions(prev => prev.filter(s => s._id !== id));
            if (selectedSession?._id === id) { setSelectedSession(null); setView('list'); }
        } catch { /* silent */ }
    }

    const filtered = sessions.filter(s =>
        !search.trim() ||
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        (s.subject || '').toLowerCase().includes(search.toLowerCase())
    );

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="px-4 py-6 sm:px-0">

            {/* ── Page header ─────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">AI Doubt Overflow</h1>
                    <p className="mt-1 text-gray-400 text-sm">
                        Ask any academic doubt — AI answers instantly &amp; every Q&amp;A is saved to the database
                    </p>
                </div>
                <button
                    onClick={() => { setView('ask'); setFormError(''); }}
                    className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-2.5 px-5 rounded-lg shadow-lg shadow-purple-900/30 transition-all transform hover:scale-[1.02] text-sm"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    Ask a Question
                </button>
            </div>

            {/* ════════════════════════════════════════════════════════════════
               VIEW: LIST
            ════════════════════════════════════════════════════════════════ */}
            {view === 'list' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                    {/* ── Main column ───────────────────────────────────────── */}
                    <div className="lg:col-span-3 space-y-4">

                        {/* Toolbar */}
                        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                            <div className="relative flex-1">
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search questions…"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-black/50 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-600 text-sm"
                                />
                            </div>
                            <p className="text-sm text-gray-500 flex-shrink-0">
                                <span className="text-white font-bold">{filtered.length}</span> question{filtered.length !== 1 ? 's' : ''}
                            </p>
                        </div>

                        {/* Questions */}
                        {loadingSessions ? (
                            <div className="flex justify-center py-20">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-xl p-14 text-center">
                                <div className="w-16 h-16 rounded-full bg-indigo-900/30 border border-indigo-500/30 flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <p className="text-white font-semibold mb-1">No questions yet</p>
                                <p className="text-gray-500 text-sm">Be the first to ask an academic doubt!</p>
                                <button
                                    onClick={() => setView('ask')}
                                    className="mt-5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-2 px-6 rounded-lg text-sm hover:from-purple-700 hover:to-indigo-700 transition-all"
                                >
                                    Ask a Question
                                </button>
                            </div>
                        ) : (
                            <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden divide-y divide-white/5">
                                {filtered.map(s => {
                                    const answerCount = Math.floor((s.messageCount ?? 0) / 2);
                                    const hasAnswer = answerCount > 0;
                                    return (
                                        <div
                                            key={s._id}
                                            onClick={() => openSession(s)}
                                            className="flex gap-4 p-5 hover:bg-white/5 cursor-pointer transition-colors group"
                                        >
                                            {/* Answer count badge */}
                                            <div className="flex-shrink-0 flex flex-col items-center gap-0.5 pt-0.5 w-16">
                                                <div className={`text-center w-full py-1.5 rounded-lg border text-xs font-bold leading-none ${hasAnswer
                                                    ? 'bg-indigo-900/40 border-indigo-500/50 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                                                    : 'bg-black/30 border-gray-700 text-gray-600'}`}>
                                                    <div className="text-lg font-black">{answerCount}</div>
                                                    <div className="text-[9px] uppercase tracking-wider mt-0.5 font-semibold">
                                                        {answerCount === 1 ? 'answer' : 'answers'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-base font-semibold text-indigo-300 group-hover:text-purple-300 transition-colors leading-snug mb-1.5">
                                                    {s.title}
                                                </h3>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {s.subject && (
                                                        <span className="bg-gray-800 border border-gray-700 text-gray-400 text-xs px-2 py-0.5 rounded">
                                                            {s.subject}
                                                        </span>
                                                    )}
                                                    {s.standard && (
                                                        <span className="bg-gray-800 border border-gray-700 text-gray-400 text-xs px-2 py-0.5 rounded">
                                                            Class {s.standard}
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-gray-600">
                                                        asked {timeAgo(s.createdAt)} by{' '}
                                                        <span className="text-purple-400">{user?.name || 'You'}</span>
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Delete btn */}
                                            <button
                                                onClick={e => handleDelete(s._id, e)}
                                                className="opacity-0 group-hover:opacity-100 text-red-500/70 hover:text-red-400 p-1 self-start flex-shrink-0 transition-all"
                                                title="Delete question"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* ── Right sidebar ─────────────────────────────────────── */}
                    <div className="space-y-5">
                        {/* About */}
                        <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                            <h3 className="font-bold text-white mb-3 text-sm border-b border-white/10 pb-2">
                                About AI Doubt Overflow
                            </h3>
                            <ul className="text-xs text-gray-400 space-y-2.5">
                                {[
                                    'Powered by AI — instant, curriculum-aware answers',
                                    'Every question & answer saved to database',
                                    'Ask follow-up questions inside any session',
                                    'Supports your board, class & subject context',
                                ].map((tip, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <svg className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        {tip}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Stats */}
                        <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                            <h3 className="font-bold text-white mb-3 text-sm border-b border-white/10 pb-2">Your Stats</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-400">Questions asked</span>
                                    <span className="font-bold text-white bg-indigo-900/40 border border-indigo-500/30 px-2.5 py-0.5 rounded-full text-xs">
                                        {sessions.length}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-400">AI answers received</span>
                                    <span className="font-bold text-indigo-300 bg-indigo-900/40 border border-indigo-500/30 px-2.5 py-0.5 rounded-full text-xs">
                                        {sessions.reduce((sum, s) => sum + Math.floor((s.messageCount ?? 0) / 2), 0)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Browse by subject */}
                        {subjects.length > 0 && (
                            <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                                <h3 className="font-bold text-white mb-3 text-sm border-b border-white/10 pb-2">Browse by Subject</h3>
                                <div className="flex flex-wrap gap-2">
                                    {subjects.map(s => (
                                        <button
                                            key={s.name}
                                            onClick={() => setSearch(s.name)}
                                            className="bg-black/40 hover:bg-indigo-900/30 border border-gray-700 hover:border-indigo-500/50 text-gray-400 hover:text-indigo-300 text-xs px-2.5 py-1 rounded transition-all"
                                        >
                                            {s.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
               VIEW: ASK QUESTION
            ════════════════════════════════════════════════════════════════ */}
            {view === 'ask' && (
                <div className="max-w-3xl">
                    {/* Back */}
                    <button onClick={() => setView('list')} className="mb-5 flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        All Questions
                    </button>

                    <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 shadow-xl rounded-xl p-6">
                        <h2 className="text-xl font-bold text-white mb-6">Ask a Question</h2>

                        {formError && (
                            <div className="mb-5 bg-red-900/30 border border-red-700/50 rounded-lg px-4 py-3 text-red-300 text-sm">
                                {formError}
                            </div>
                        )}

                        {/* Tips */}
                        <div className="mb-6 bg-indigo-900/20 border border-indigo-500/20 rounded-lg p-4 text-sm">
                            <p className="font-semibold text-indigo-300 mb-2 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Tips for a great question
                            </p>
                            <ul className="text-gray-400 space-y-1.5 list-disc list-inside text-xs">
                                <li>State exactly what you don't understand</li>
                                <li>Mention the chapter or topic if possible</li>
                                <li>You can ask follow-up questions after the AI answers</li>
                            </ul>
                        </div>

                        <form onSubmit={handlePost} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-200 mb-1">
                                    Question Title <span className="text-red-400">*</span>
                                </label>
                                <p className="text-xs text-gray-500 mb-2">Be specific — imagine asking a teacher in one sentence</p>
                                <input
                                    type="text"
                                    required
                                    maxLength={150}
                                    value={askTitle}
                                    onChange={e => setAskTitle(e.target.value)}
                                    placeholder="e.g., Why does the moon not fall towards Earth due to gravity?"
                                    className="w-full px-4 py-3 bg-black/50 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-600 text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-200 mb-1">Subject</label>
                                <select
                                    value={askSubject}
                                    onChange={e => setAskSubject(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-black/50 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="">— Select subject (optional) —</option>
                                    {subjects.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-200 mb-1">
                                    Question Body <span className="text-red-400">*</span>
                                </label>
                                <p className="text-xs text-gray-500 mb-2">Explain your doubt in detail — the more context, the better the AI answer</p>
                                <textarea
                                    required
                                    rows={7}
                                    value={askBody}
                                    onChange={e => setAskBody(e.target.value)}
                                    placeholder="Describe what you've understood so far and exactly where you're stuck..."
                                    className="w-full px-4 py-3 bg-black/50 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-600 resize-y text-sm"
                                />

                                {/* ── Image upload ── */}
                                <div className="mt-3">
                                    <input
                                        ref={imageInputRef}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={e => {
                                            const files = Array.from(e.target.files ?? []);
                                            if (files.length + askImages.length > 3) {
                                                alert('Maximum 3 images allowed');
                                                return;
                                            }
                                            setAskImages(prev => [...prev, ...files].slice(0, 3));
                                            e.target.value = '';
                                        }}
                                    />

                                    {/* Thumbnails */}
                                    {askImages.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {askImages.map((file, i) => (
                                                <div key={i} className="relative group">
                                                    <img
                                                        src={URL.createObjectURL(file)}
                                                        alt={`Attachment ${i + 1}`}
                                                        className="w-20 h-20 object-cover rounded-lg border border-gray-700"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setAskImages(prev => prev.filter((_, idx) => idx !== i))}
                                                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Attach button */}
                                    {askImages.length < 3 && (
                                        <button
                                            type="button"
                                            onClick={() => imageInputRef.current?.click()}
                                            className="inline-flex items-center gap-2 bg-black/40 hover:bg-gray-800 border border-gray-700 hover:border-indigo-500/50 text-gray-400 hover:text-indigo-300 text-xs px-3 py-2 rounded-lg transition-all"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            Attach Image{askImages.length > 0 ? ` (${askImages.length}/3)` : 's'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-1">
                                <button
                                    type="submit"
                                    disabled={posting || !askTitle.trim() || !askBody.trim()}
                                    className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-2.5 px-6 rounded-lg disabled:opacity-50 transition-all shadow-lg shadow-purple-900/20 text-sm"
                                >
                                    {posting ? (
                                        <>
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Getting AI Answer…
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                            </svg>
                                            Post Question
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setView('list')}
                                    className="px-5 py-2.5 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 rounded-lg text-sm transition-colors"
                                >
                                    Discard
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
               VIEW: DETAIL
            ════════════════════════════════════════════════════════════════ */}
            {view === 'detail' && (
                <div>
                    <button onClick={() => setView('list')} className="mb-5 flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        All Questions
                    </button>

                    {loadingSession ? (
                        <div className="flex justify-center py-24">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500" />
                        </div>
                    ) : selectedSession ? (
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                            {/* ── Main: Q&A column ───────────────────────────── */}
                            <div className="lg:col-span-3 space-y-6">

                                {/* Question header card */}
                                <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 shadow-xl rounded-xl p-6">
                                    <h2 className="text-2xl font-bold text-white mb-3">{selectedSession.title}</h2>
                                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-gray-500 mb-4">
                                        <span className="flex items-center gap-1">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            Asked {formatDate(selectedSession.createdAt)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                            </svg>
                                            {Math.floor((selectedSession.messages?.length ?? 0) / 2)} answers
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedSession.subject && (
                                            <span className="bg-indigo-900/40 border border-indigo-500/40 text-indigo-300 text-xs px-2.5 py-1 rounded-full">
                                                {selectedSession.subject}
                                            </span>
                                        )}
                                        {selectedSession.standard && (
                                            <span className="bg-gray-800 border border-gray-700 text-gray-400 text-xs px-2.5 py-1 rounded-full">
                                                Class {selectedSession.standard}
                                            </span>
                                        )}
                                        {selectedSession.boardCode && (
                                            <span className="bg-gray-800 border border-gray-700 text-gray-400 text-xs px-2.5 py-1 rounded-full">
                                                {selectedSession.boardCode}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Q&A Pairs */}
                                {buildQAPairs(selectedSession.messages ?? []).map((pair, idx) => {
                                    const isFollowUp = idx > 0;
                                    return (
                                        <div key={idx} className={`space-y-3 ${isFollowUp ? 'ml-6 border-l-2 border-gray-800 pl-5' : ''}`}>

                                            {/* ── Student message block ── */}
                                            <div>

                                                {/* Body */}
                                                <div className={`flex-1 backdrop-blur-xl rounded-xl p-5 ${isFollowUp
                                                    ? 'bg-gray-900/30 border border-white/5'
                                                    : 'bg-gray-900/40 border border-white/8'
                                                    }`}>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        {isFollowUp ? (
                                                            /* Follow-up badge — muted, clearly not a new question */
                                                            <span className="text-xs font-semibold text-gray-500 bg-gray-800/60 border border-gray-700 px-2 py-0.5 rounded flex items-center gap-1.5">
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                                                </svg>
                                                                Clarification
                                                            </span>
                                                        ) : (
                                                            /* Original question badge */
                                                            <span className="text-xs font-bold uppercase tracking-wider text-purple-400 bg-purple-900/30 border border-purple-500/30 px-2 py-0.5 rounded">
                                                                Question
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isFollowUp ? 'text-gray-300' : 'text-gray-100'}`}>
                                                        {pair.q.content}
                                                    </p>

                                                    {/* Attached images */}
                                                    {pair.q.images && pair.q.images.length > 0 && (
                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            {pair.q.images.map((imgPath, imgIdx) => (
                                                                <a
                                                                    key={imgIdx}
                                                                    href={`http://localhost:4000/${imgPath}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                >
                                                                    <img
                                                                        src={`http://localhost:4000/${imgPath}`}
                                                                        alt={`Attachment ${imgIdx + 1}`}
                                                                        className="h-32 w-auto rounded-lg border border-gray-700 object-cover hover:opacity-90 transition-opacity cursor-zoom-in"
                                                                    />
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <div className="mt-4 pt-3 border-t border-white/5 flex justify-end">
                                                        <span className="text-xs text-gray-600 bg-blue-900/10 border border-blue-900/20 rounded px-3 py-1.5 flex items-center gap-2">
                                                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-[9px]">
                                                                {user?.name?.charAt(0).toUpperCase() || 'S'}
                                                            </div>
                                                            <span className="text-purple-400 font-medium">{user?.name || 'You'}</span>
                                                            <span className="text-gray-600">· {timeAgo(pair.q.createdAt)}</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* ── AI Answer block ── */}
                                            {pair.a && (
                                                <div>
                                                    <div className={`backdrop-blur-xl rounded-xl p-5 ${isFollowUp
                                                        ? 'bg-gray-900/30 border border-indigo-500/10'
                                                        : 'bg-gray-900/40 border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.07)]'
                                                        }`}>
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1 ${isFollowUp
                                                                ? 'text-indigo-400/70 bg-indigo-900/20 border border-indigo-500/20'
                                                                : 'text-indigo-300 bg-indigo-900/30 border border-indigo-500/30'
                                                                }`}>
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                                AI Answer
                                                            </span>
                                                            <span className="text-xs text-gray-600">by AI Tutor</span>
                                                        </div>
                                                        <p className="text-gray-100 text-sm leading-relaxed whitespace-pre-wrap">{pair.a.content}</p>
                                                        <div className="mt-4 pt-3 border-t border-white/5 flex justify-end">
                                                            <span className="text-xs bg-indigo-900/10 border border-indigo-900/20 rounded px-3 py-1.5 flex items-center gap-2">
                                                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
                                                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                                                    </svg>
                                                                </div>
                                                                <span className="text-indigo-300 font-medium">AI Tutor</span>
                                                                <span className="text-gray-600">· {timeAgo(pair.a.createdAt)}</span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* AI thinking indicator */}
                                {asking && (
                                    <div>
                                        <div className="bg-gray-900/40 border border-indigo-500/20 rounded-xl p-5">
                                            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 bg-indigo-900/30 border border-indigo-500/30 px-2 py-0.5 rounded inline-flex items-center gap-1.5 mb-3">
                                                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
                                                AI is thinking…
                                            </span>
                                            <div className="flex space-x-1.5 mt-2">
                                                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={bottomRef} />

                                {/* ── Follow-up question form ── */}
                                <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 shadow-xl rounded-xl p-6">
                                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Need more help? Ask a follow-up
                                    </h3>
                                    {formError && (
                                        <p className="mb-3 text-red-400 text-sm bg-red-900/20 border border-red-800/50 rounded-lg px-4 py-2">
                                            {formError}
                                        </p>
                                    )}
                                    <form onSubmit={handleFollowUp} className="space-y-3">
                                        <textarea
                                            ref={followUpRef}
                                            rows={3}
                                            value={followUp}
                                            onChange={e => setFollowUp(e.target.value)}
                                            disabled={asking}
                                            placeholder="Still confused about something? Type a follow-up question…"
                                            className="w-full px-4 py-3 bg-black/50 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-600 resize-y text-sm disabled:opacity-50"
                                        />
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-gray-600">Answer + follow-up are both saved to the database automatically</p>
                                            <button
                                                type="submit"
                                                disabled={!followUp.trim() || asking}
                                                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-2 px-5 rounded-lg disabled:opacity-40 text-sm transition-all shadow-lg shadow-purple-900/20"
                                            >
                                                {asking ? (
                                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                    </svg>
                                                )}
                                                {asking ? 'Getting Answer…' : 'Post Follow-up'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>

                            {/* ── Right sidebar ─────────────────────────────── */}
                            <div className="space-y-5">
                                {/* Question info */}
                                <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                                    <h3 className="font-bold text-white mb-3 text-sm border-b border-white/10 pb-2">Question Info</h3>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-400">Asked</span>
                                            <span className="text-gray-300 text-xs">{formatDate(selectedSession.createdAt)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-400">Answers</span>
                                            <span className="text-indigo-300 font-bold">
                                                {Math.floor((selectedSession.messages?.length ?? 0) / 2)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-400">Messages</span>
                                            <span className="text-gray-300">{selectedSession.messages?.length ?? 0}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Other questions */}
                                {sessions.filter(s => s._id !== selectedSession._id).length > 0 && (
                                    <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                                        <h3 className="font-bold text-white mb-3 text-sm border-b border-white/10 pb-2">Other Questions</h3>
                                        <ul className="space-y-2">
                                            {sessions
                                                .filter(s => s._id !== selectedSession._id)
                                                .slice(0, 5)
                                                .map(s => (
                                                    <li key={s._id}>
                                                        <button
                                                            onClick={() => openSession(s)}
                                                            className="text-left text-indigo-300 hover:text-purple-300 text-xs leading-snug line-clamp-2 transition-colors"
                                                        >
                                                            {s.title}
                                                        </button>
                                                    </li>
                                                ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}

